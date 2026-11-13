// BLL: ticket issuing, verification, entitlement checks and claim codes.
import { ticketRepository, codeRepository } from '../repositories/ticketRepository.js';
import { siteRepository } from '../repositories/siteRepository.js';
import { badRequest, notFound, conflict } from '../utils/http.js';
import { newToken } from '../utils/ids.js';
import { iso, HOUR_MS } from '../utils/time.js';
import { transaction } from '../db.js';

/** Public shape of a ticket (contract). */
export function publicTicket(t) {
  if (!t) return null;
  return {
    token: t.token,
    orderId: t.orderId,
    code: t.code,
    scope: t.scope,
    siteIds: t.siteIds,
    issuedAt: t.issuedAt,
    expiresAt: t.expiresAt,
    packageName: t.packageName
  };
}

function isValid(t, now = Date.now()) {
  return !!t && !t.revoked && t.expiresMs > now;
}

function normalizeCodeInput(input, previous = null) {
  const src = { ...(previous || {}), ...(input || {}) };
  const scope = src.scope === 'site' ? 'site' : 'all';
  const siteIds = Array.isArray(src.siteIds) ? src.siteIds.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  if (scope === 'site' && !siteIds.length) throw badRequest('Mã phạm vi "site" cần ít nhất một địa điểm (siteIds)');
  const durationHours = Math.round(Number(src.durationHours));
  if (!Number.isFinite(durationHours) || durationHours <= 0) throw badRequest('Thời hạn (durationHours) phải > 0');
  const maxUses = Math.round(Number(src.maxUses));
  if (!Number.isFinite(maxUses) || maxUses <= 0) throw badRequest('Số lượt dùng tối đa (maxUses) phải > 0');
  const usedCount = Math.max(0, Math.round(Number(src.usedCount) || 0));
  return {
    scope,
    siteIds: scope === 'site' ? siteIds : [],
    durationHours,
    maxUses,
    usedCount,
    isActive: src.isActive === undefined ? true : !!src.isActive,
    note: src.note ? String(src.note) : ''
  };
}

export const ticketService = {
  async issue({ orderId = null, code = null, scope, siteIds = [], durationHours, packageName, visitorId = null }) {
    const now = Date.now();
    const expiresMs = now + durationHours * HOUR_MS;
    return ticketRepository.insert({
      token: newToken(16),
      orderId,
      code,
      scope,
      siteIds: scope === 'site' ? siteIds : [],
      issuedAt: iso(now),
      expiresAt: iso(expiresMs),
      expiresMs,
      packageName,
      visitorId
    });
  },
  async findValid(token) {
    if (!token) return null;
    const t = await ticketRepository.findByToken(String(token));
    return isValid(t) ? t : null;
  },
  async verify(token) {
    const t = await this.findValid(token);
    return t ? { valid: true, ticket: publicTicket(t) } : { valid: false };
  },
  async hasAccess(token, siteId) {
    const t = await this.findValid(token);
    if (!t) return false;
    return t.scope === 'all' || t.siteIds.includes(Number(siteId));
  },
  async forOrder(orderId) {
    const t = await ticketRepository.findByOrder(orderId);
    return t && !t.revoked ? t : null;
  },
  async ensureForOrder(order, pkg) {
    const existing = await ticketRepository.findByOrder(order.id);
    if (existing) {
      if (existing.revoked) await ticketRepository.setRevokedByOrder(order.id, false);
      return ticketRepository.findByOrder(order.id);
    }
    return this.issue({
      orderId: order.id,
      scope: pkg ? pkg.scope : (order.siteId ? 'site' : 'all'),
      siteIds: order.siteId ? [order.siteId] : [],
      durationHours: pkg ? pkg.durationHours : 24,
      packageName: order.packageName,
      visitorId: order.visitorId
    });
  },
  async revokeForOrder(orderId) {
    await ticketRepository.setRevokedByOrder(orderId, true);
  },

  // ---------- claim codes ----------
  async redeem(rawCode, visitorId = null) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) return { ok: false, message: 'Vui lòng nhập mã kích hoạt' };
    return transaction(async () => {
      const c = await codeRepository.findByCode(code);
      if (!c || !c.isActive) return { ok: false, message: 'Mã không hợp lệ hoặc đã bị vô hiệu hoá' };
      if (c.usedCount >= c.maxUses) return { ok: false, message: 'Mã đã hết lượt sử dụng' };
      if (!(await codeRepository.incrementUse(code))) return { ok: false, message: 'Mã đã hết lượt sử dụng' };
      const t = await this.issue({
        code,
        scope: c.scope,
        siteIds: c.siteIds,
        durationHours: c.durationHours,
        packageName: c.scope === 'all' ? `Mã ${code} – Toàn bộ điểm` : `Mã ${code}`,
        visitorId
      });
      return { ok: true, ticket: publicTicket(t), message: 'Kích hoạt thành công! Bạn đã mở khoá thuyết minh đầy đủ.' };
    });
  },
  async listCodes() {
    return codeRepository.findAll();
  },
  async createCode(input) {
    const code = String((input && input.code) || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) throw badRequest('Mã phải gồm 3–32 ký tự A-Z, 0-9, "-" hoặc "_"');
    if (await codeRepository.findByCode(code)) throw conflict('Mã đã tồn tại');
    const c = normalizeCodeInput(input);
    for (const id of c.siteIds) if (!(await siteRepository.exists(id))) throw badRequest(`Địa điểm id=${id} không tồn tại`);
    return codeRepository.insert({ ...c, code, createdAt: iso() });
  },
  async updateCode(rawCode, input) {
    const code = String(rawCode).trim().toUpperCase();
    const prev = await codeRepository.findByCode(code);
    if (!prev) throw notFound('Không tìm thấy mã');
    const c = normalizeCodeInput(input, prev);
    return codeRepository.update(code, c);
  },
  async deleteCode(rawCode) {
    if (!(await codeRepository.delete(String(rawCode).trim().toUpperCase()))) throw notFound('Không tìm thấy mã');
    return { ok: true };
  }
};
