// BLL: packages, orders and the demo payment gateway.
import { orderRepository } from '../repositories/orderRepository.js';
import { packageRepository } from '../repositories/packageRepository.js';
import { siteRepository } from '../repositories/siteRepository.js';
import { ticketService, publicTicket } from './ticketService.js';
import { badRequest, notFound, conflict } from '../utils/http.js';
import { newOrderId } from '../utils/ids.js';
import { iso, parseVnDate, DAY_MS, vnDateTime } from '../utils/time.js';
import { transaction } from '../db.js';
import { normLang } from '../utils/text.js';

export const PAYMENT_METHODS = ['vietqr', 'momo', 'card'];
export const ORDER_STATUSES = ['pending', 'paid', 'expired', 'refunded', 'cancelled'];
const ORDER_TTL_MS = 15 * 60 * 1000;

async function expireStale() {
  await orderRepository.expireStale(iso());
}

/** Order as returned by the API (adds ticket when paid). */
async function present(order, { includeTicket = true } = {}) {
  if (!order) return null;
  const { demo, ...rest } = order;
  const out = { ...rest };
  if (includeTicket && order.status === 'paid') {
    const t = await ticketService.forOrder(order.id);
    if (t) out.ticket = publicTicket(t);
  }
  return out;
}

async function presentAdmin(order) {
  const out = await present(order, { includeTicket: false });
  out.demo = !!order.demo;
  return out;
}

function normalizePackage(input, previous = null) {
  const src = { ...(previous || {}), ...(input || {}) };
  const code = String(src.code || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  if (!code) throw badRequest('Mã gói (code) không được để trống');
  const nameVi = String(src.nameVi || '').trim();
  if (!nameVi) throw badRequest('Tên gói (nameVi) không được để trống');
  const price = Math.round(Number(src.price));
  if (!Number.isFinite(price) || price < 0) throw badRequest('Giá (price) không hợp lệ');
  const durationHours = Math.round(Number(src.durationHours));
  if (!Number.isFinite(durationHours) || durationHours <= 0) throw badRequest('Thời hạn (durationHours) phải > 0');
  return {
    code,
    nameVi,
    nameEn: String(src.nameEn || nameVi).trim(),
    descVi: String(src.descVi || ''),
    descEn: String(src.descEn || ''),
    price,
    scope: src.scope === 'site' ? 'site' : 'all',
    durationHours,
    maxPeople: Math.max(1, Math.round(Number(src.maxPeople) || 1)),
    isActive: src.isActive === undefined ? true : !!src.isActive,
    badgeVi: src.badgeVi ? String(src.badgeVi) : null,
    badgeEn: src.badgeEn ? String(src.badgeEn) : null,
    sortOrder: Math.round(Number(src.sortOrder) || 0)
  };
}

export const orderService = {
  // ---------- packages ----------
  async listPackages({ includeInactive = false } = {}) {
    return packageRepository.findAll({ includeInactive });
  },
  async createPackage(input) {
    const p = normalizePackage(input);
    if (await packageRepository.findByCode(p.code)) throw conflict('Mã gói đã tồn tại');
    return packageRepository.insert(p);
  },
  async updatePackage(id, input) {
    const prev = await packageRepository.findById(Number(id));
    if (!prev) throw notFound('Không tìm thấy gói vé');
    const p = normalizePackage(input, prev);
    const dup = await packageRepository.findByCode(p.code);
    if (dup && dup.id !== prev.id) throw conflict('Mã gói đã tồn tại');
    return packageRepository.update(prev.id, p);
  },
  async deletePackage(id) {
    if (!(await packageRepository.delete(Number(id)))) throw notFound('Không tìm thấy gói vé');
    return { ok: true };
  },

  // ---------- orders (public) ----------
  async create({ packageId, siteId = null, visitorId = null, lang = 'vi', method = 'vietqr', customerName = null, customerPhone = null }) {
    const pkg = await packageRepository.findById(Number(packageId));
    if (!pkg || !pkg.isActive) throw badRequest('Gói vé không tồn tại hoặc đã ngừng bán');
    if (!PAYMENT_METHODS.includes(method)) throw badRequest('Phương thức thanh toán không hợp lệ');
    const sid = siteId == null || siteId === '' ? null : Number(siteId);
    if (sid != null) {
      const site = await siteRepository.findById(sid);
      if (!site || !site.isActive) throw badRequest('Địa điểm không tồn tại');
    }
    if (pkg.scope === 'site' && sid == null) throw badRequest('Gói lẻ theo điểm cần chọn địa điểm (siteId)');
    let id = newOrderId();
    while (await orderRepository.exists(id)) id = newOrderId();
    const now = Date.now();
    const order = await orderRepository.insert({
      id,
      packageId: pkg.id,
      packageName: pkg.nameVi,
      siteId: sid,
      amount: pkg.price,
      method,
      status: 'pending',
      visitorId: visitorId ? String(visitorId).slice(0, 64) : null,
      lang: normLang(lang),
      customerName: customerName ? String(customerName).slice(0, 120) : null,
      customerPhone: customerPhone ? String(customerPhone).slice(0, 32) : null,
      createdAt: iso(now),
      createdMs: now,
      expiresAt: iso(now + ORDER_TTL_MS),
      transferNote: `HLSG ${id}`
    });
    // Free packages are paid immediately.
    if (pkg.price === 0) return this.pay(order.id, { method });
    return present(order);
  },
  async get(id) {
    await expireStale();
    const o = await orderRepository.findById(String(id).toUpperCase());
    if (!o) throw notFound('Không tìm thấy đơn hàng');
    return present(o);
  },
  /** Demo payment gateway: marks the order paid and issues the ticket (idempotent). */
  async pay(id, { method } = {}) {
    await expireStale();
    return transaction(async () => {
      const o = await orderRepository.findByIdForUpdate(String(id).toUpperCase());
      if (!o) throw notFound('Không tìm thấy đơn hàng');
      if (o.status === 'paid') return present(o);
      if (o.status === 'expired') throw conflict('Đơn hàng đã hết hạn thanh toán, vui lòng tạo đơn mới');
      if (o.status !== 'pending') throw conflict(`Đơn hàng đang ở trạng thái "${o.status}", không thể thanh toán`);
      if (method && PAYMENT_METHODS.includes(method) && method !== o.method) await orderRepository.setMethod(o.id, method);
      return present(await this._markPaid(o));
    });
  },
  async _markPaid(o) {
    const now = Date.now();
    const updated = await orderRepository.setStatus(o.id, 'paid', { paidAt: iso(now), paidMs: now });
    await ticketService.ensureForOrder(updated, await packageRepository.findById(updated.packageId));
    return updated;
  },

  // ---------- orders (admin) ----------
  async search({ status, from, to, q, page = 1, pageSize = 20 } = {}) {
    await expireStale();
    if (status && !ORDER_STATUSES.includes(status)) throw badRequest('Trạng thái không hợp lệ');
    const fromMs = from ? parseVnDate(from) : null;
    let toMs = to ? parseVnDate(to) : null;
    if (toMs != null && /^\d{4}-\d{2}-\d{2}$/.test(String(to))) toMs += DAY_MS; // inclusive end date
    const ps = Math.min(200, Math.max(1, Number(pageSize) || 20));
    const pg = Math.max(1, Number(page) || 1);
    const { items, total } = await orderRepository.search({
      status: status || null, fromMs, toMs, q: q ? String(q).trim() : null, limit: ps, offset: (pg - 1) * ps
    });
    const out = [];
    for (const o of items) out.push(await presentAdmin(o));
    return { items: out, total, page: pg, pageSize: ps };
  },
  async adminSetStatus(id, status) {
    if (!['paid', 'refunded', 'cancelled'].includes(status)) throw badRequest('Trạng thái chỉ được là paid, refunded hoặc cancelled');
    return transaction(async () => {
      const o = await orderRepository.findByIdForUpdate(String(id).toUpperCase());
      if (!o) throw notFound('Không tìm thấy đơn hàng');
      if (status === 'paid') {
        if (o.status === 'paid') return presentAdmin(o);
        return presentAdmin(await this._markPaid(o));
      }
      if (status === 'refunded' && o.status !== 'paid') throw conflict('Chỉ hoàn tiền được đơn đã thanh toán');
      const updated = await orderRepository.setStatus(o.id, status);
      await ticketService.revokeForOrder(o.id);
      return presentAdmin(updated);
    });
  },
  async recent(limit = 10) {
    await expireStale();
    const out = [];
    for (const o of await orderRepository.recent(limit)) out.push(await presentAdmin(o));
    return out;
  },
  async csv(filters = {}) {
    await expireStale();
    const fromMs = filters.from ? parseVnDate(filters.from) : null;
    let toMs = filters.to ? parseVnDate(filters.to) : null;
    if (toMs != null && /^\d{4}-\d{2}-\d{2}$/.test(String(filters.to))) toMs += DAY_MS;
    const { items } = await orderRepository.search({
      status: filters.status || null, fromMs, toMs, q: filters.q ? String(filters.q).trim() : null
    });
    const sites = new Map((await siteRepository.findAll({ includeInactive: true })).map((s) => [s.id, s.nameVi]));
    const header = ['Mã đơn', 'Gói vé', 'Địa điểm', 'Số tiền (VND)', 'Phương thức', 'Trạng thái', 'Khách hàng', 'SĐT',
      'Tạo lúc', 'Thanh toán lúc', 'Nội dung CK', 'Dữ liệu mô phỏng'];
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.map(esc).join(',')];
    for (const o of items) {
      lines.push([
        o.id, o.packageName, o.siteId ? sites.get(o.siteId) || o.siteId : '', o.amount, o.method, o.status,
        o.customerName, o.customerPhone, vnDateTime(Date.parse(o.createdAt)),
        o.paidAt ? vnDateTime(Date.parse(o.paidAt)) : '', o.transferNote, o.demo ? 'có' : ''
      ].map(esc).join(','));
    }
    return '﻿' + lines.join('\r\n') + '\r\n';
  }
};
