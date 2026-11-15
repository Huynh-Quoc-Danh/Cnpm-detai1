// BLL: lớp phạm vi tenant cho API quản trị.
// - Quản trị nền tảng (superadmin): thấy mọi dữ liệu, gọi thẳng các service sẵn có.
// - Quản trị của một ban (tenant): chỉ thấy và chỉ sửa được địa điểm, gói vé, mã kích hoạt, đơn hàng,
//   khách trực tiếp và số liệu thuộc ban mình. Dữ liệu ngoài phạm vi trả về 404 như thể không tồn tại.
// Lớp này chỉ GỌI các service/repository sẵn có (địa điểm, bán vé, thống kê); không thay đổi chúng.
import { tenantRepository } from '../repositories/tenantRepository.js';
import { siteRepository } from '../repositories/siteRepository.js';
import { listenRepository } from '../repositories/visitorRepository.js';
import { orderRepository } from '../repositories/orderRepository.js';
import { siteService } from './siteService.js';
import { orderService, ORDER_STATUSES } from './orderService.js';
import { ticketService } from './ticketService.js';
import { visitorService } from './visitorService.js';
import { statsService, windows } from './statsService.js';
import { isSuperAdmin } from './adminAuthService.js';
import { DEFAULT_TENANT_ID } from '../db.js';
import { badRequest, notFound } from '../utils/http.js';
import { iso, parseVnDate, vnDayStart, vnParts, vnDateKey, vnDayLabel, vnDateTime, DAY_MS, HOUR_MS, WEEKDAY_VI } from '../utils/time.js';

/** Phạm vi dữ liệu của tài khoản đang đăng nhập (gắn vào req.scope ở middleware). */
export async function scopeFor(admin) {
  if (isSuperAdmin(admin)) return { isSuper: true, tenantId: null, tenantName: null, siteIds: null };
  return {
    isSuper: false,
    tenantId: admin.tenantId,
    tenantName: admin.tenantName,
    siteIds: new Set(await tenantRepository.siteIds(admin.tenantId))
  };
}

const outOfScope = (what) => notFound(`Không tìm thấy ${what}`);
const inSites = (scope, siteId) => scope.isSuper || (siteId != null && scope.siteIds.has(Number(siteId)));

/** Superadmin có thể chỉ định ban khi tạo mới; ban quản lý thì luôn là ban của mình. */
async function targetTenant(scope, requested) {
  if (!scope.isSuper) return scope.tenantId;
  if (requested == null || requested === '') return DEFAULT_TENANT_ID;
  const id = Number(requested);
  if (!(await tenantRepository.findById(id))) throw badRequest('Ban quản lý không tồn tại');
  return id;
}

/** Mã kích hoạt của một ban chỉ được mở khoá địa điểm của ban đó. */
function scopeCodeInput(scope, input, { creating }) {
  if (scope.isSuper) return input;
  const own = [...scope.siteIds];
  const wantsAll = input.scope === 'all' || (creating && input.scope !== 'site');
  if (wantsAll) {
    if (!own.length) throw badRequest('Ban quản lý chưa có địa điểm nào để áp dụng mã');
    return { ...input, scope: 'site', siteIds: own };
  }
  if (Array.isArray(input.siteIds)) {
    for (const id of input.siteIds) if (!scope.siteIds.has(Number(id))) throw badRequest(`Địa điểm id=${id} không thuộc ban quản lý của bạn`);
  }
  return input;
}

function parseOrderFilters({ status, from, to, q } = {}) {
  if (status && !ORDER_STATUSES.includes(status)) throw badRequest('Trạng thái không hợp lệ');
  const fromMs = from ? parseVnDate(from) : null;
  let toMs = to ? parseVnDate(to) : null;
  if (toMs != null && /^\d{4}-\d{2}-\d{2}$/.test(String(to))) toMs += DAY_MS; // ngày kết thúc tính trọn ngày
  return { status: status || null, fromMs, toMs, q: q ? String(q).trim() : null };
}

const sumOrders = (rows) => ({ tickets: rows.length, revenue: rows.reduce((a, r) => a + r.amount, 0) });
const pctChange = (cur, prev) => (!prev ? (cur ? 100 : 0) : Math.round(((cur - prev) / prev) * 1000) / 10);
const pad = (n) => String(n).padStart(2, '0');

export const tenantScope = {
  /** Ban sở hữu dữ liệu mới tạo – kiểm tra TRƯỚC khi tạo để không sinh dữ liệu dở dang. */
  targetTenant,

  // ---------- địa điểm & điểm nhấn ----------
  async listSites(scope) {
    const owners = await tenantRepository.siteOwners();
    return (await siteService.listAdmin())
      .filter((s) => inSites(scope, s.id))
      .map((s) => ({ ...s, tenantId: owners.get(s.id) ?? null }));
  },
  assertSite(scope, siteId) {
    if (!inSites(scope, siteId)) throw outOfScope('địa điểm');
  },
  async assertExhibit(scope, exhibitId) {
    if (scope.isSuper) return;
    const siteId = await tenantRepository.exhibitSiteId(exhibitId);
    if (!inSites(scope, siteId)) throw outOfScope('điểm nhấn');
  },
  async claimSite(siteId, tenantId) {
    await tenantRepository.setSitesTenant([Number(siteId)], tenantId);
  },

  // ---------- gói vé ----------
  async listPackages(scope) {
    const owners = await tenantRepository.packageOwners();
    const list = await orderService.listPackages({ includeInactive: true });
    return list
      .filter((p) => scope.isSuper || owners.get(p.id) === scope.tenantId)
      .map((p) => ({ ...p, tenantId: owners.get(p.id) ?? null }));
  },
  async assertPackage(scope, id) {
    if (scope.isSuper) return;
    if ((await tenantRepository.packageTenant(Number(id))) !== scope.tenantId) throw outOfScope('gói vé');
  },
  async claimPackage(id, tenantId) {
    await tenantRepository.setPackageTenant(Number(id), tenantId);
  },

  // ---------- mã kích hoạt ----------
  async listCodes(scope) {
    const owners = await tenantRepository.codeOwners();
    return (await ticketService.listCodes())
      .filter((c) => scope.isSuper || owners.get(c.code) === scope.tenantId)
      .map((c) => ({ ...c, tenantId: owners.get(c.code) ?? null }));
  },
  async assertCode(scope, rawCode) {
    if (scope.isSuper) return;
    const code = String(rawCode || '').trim().toUpperCase();
    if ((await tenantRepository.codeTenant(code)) !== scope.tenantId) throw outOfScope('mã kích hoạt');
  },
  codeInput: scopeCodeInput,
  async claimCode(code, tenantId) {
    await tenantRepository.setCodeTenant(code, tenantId);
  },

  // ---------- đơn hàng ----------
  async searchOrders(scope, { page = 1, pageSize = 20, ...filters } = {}) {
    if (scope.isSuper) return orderService.search({ ...filters, page, pageSize });
    await orderRepository.expireStale(iso());
    const ps = Math.min(200, Math.max(1, Number(pageSize) || 20));
    const pg = Math.max(1, Number(page) || 1);
    const { items, total } = await tenantRepository.searchOrders(scope.tenantId, {
      ...parseOrderFilters(filters), limit: ps, offset: (pg - 1) * ps
    });
    return { items, total, page: pg, pageSize: ps };
  },
  async assertOrder(scope, id) {
    if (scope.isSuper) return;
    if (!(await tenantRepository.orderInTenant(String(id).toUpperCase(), scope.tenantId))) throw outOfScope('đơn hàng');
  },
  async ordersCsv(scope, filters = {}) {
    if (scope.isSuper) return orderService.csv(filters);
    await orderRepository.expireStale(iso());
    const { items } = await tenantRepository.searchOrders(scope.tenantId, parseOrderFilters(filters));
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
  },

  // ---------- khách trực tiếp ----------
  async live(scope) {
    const live = await visitorService.live();
    if (scope.isSuper) return live;
    const visitors = live.visitors.filter((v) => inSites(scope, v.siteId));
    const simulated = visitors.filter((v) => v.simulated).length;
    return {
      ...live,
      visitors,
      perSite: live.perSite.filter((p) => inSites(scope, p.siteId)),
      liveTotal: visitors.length,
      liveReal: visitors.length - simulated,
      liveSimulated: simulated
    };
  },

  // ---------- thống kê (cùng cách tính với trang Tổng quan / Báo cáo, chỉ trên dữ liệu của ban) ----------
  async overview(scope) {
    if (scope.isSuper) return statsService.overview();
    const t = scope.tenantId;
    const now = Date.now();
    const w = windows(now);
    const monthRows = await tenantRepository.paidBetween(t, w.month.from, w.month.to);
    const inRange = (r, win) => r.paid_ms >= win.from && r.paid_ms < win.to;
    const today = sumOrders(monthRows.filter((r) => inRange(r, w.today)));
    const wk = sumOrders(monthRows.filter((r) => inRange(r, w.week)));
    const mo = sumOrders(monthRows);
    const total = await tenantRepository.paidTotals(t);
    const pm = sumOrders(await tenantRepository.paidBetween(t, w.prevMonth.from, w.month.from));
    const yRows = await tenantRepository.paidBetween(t, w.yesterday.from, w.yesterday.to);
    const pw = sumOrders(await tenantRepository.paidBetween(t, w.prevWeek.from, w.prevWeek.to));
    const y = sumOrders(yRows);
    const sameTimeCut = w.yesterday.from + (now - w.today.from); // so với hôm qua tính đến cùng giờ
    const ySame = sumOrders(yRows.filter((r) => r.paid_ms < sameTimeCut));
    const pctOrNull = (cur, prev) => (prev ? pctChange(cur, prev) : null);

    const listensMonth = (await listenRepository.between(w.month.from, w.month.to)).filter((l) => inSites(scope, l.site_id));
    const listens = {
      today: listensMonth.filter((l) => l.created_ms >= w.today.from).length,
      week: listensMonth.filter((l) => l.created_ms >= w.week.from).length,
      month: listensMonth.length
    };
    const listeners = new Set(listensMonth.map((l) => l.visitor_id).filter(Boolean)).size;
    const conversionRate = listeners ? Math.round((mo.tickets / listeners) * 1000) / 10 : 0;

    const sites = (await siteRepository.findAll({ includeInactive: true })).filter((s) => inSites(scope, s.id));
    const siteName = new Map(sites.map((s) => [s.id, s.nameVi]));
    const perSite = new Map(sites.map((s) => [s.id, { siteId: s.id, nameVi: s.nameVi, listens: 0, tickets: 0, revenue: 0 }]));
    for (const l of listensMonth) if (perSite.has(l.site_id)) perSite.get(l.site_id).listens++;
    for (const r of monthRows) {
      if (r.site_id != null && perSite.has(r.site_id)) {
        const p = perSite.get(r.site_id);
        p.tickets++;
        p.revenue += r.amount;
      }
    }
    const live = await this.live(scope);
    return {
      generatedAt: new Date(now).toISOString(),
      timezone: 'Asia/Ho_Chi_Minh',
      tenantName: scope.tenantName,
      liveTotal: live.liveTotal,
      liveReal: live.liveReal,
      liveSimulated: live.liveSimulated,
      livePerSite: live.perSite.map((p) => ({ siteId: p.siteId, nameVi: siteName.get(p.siteId) || p.nameVi, count: p.count, real: p.real, simulated: p.simulated })),
      tickets: { today: today.tickets, week: wk.tickets, month: mo.tickets, total: total.tickets },
      revenue: { today: today.revenue, week: wk.revenue, month: mo.revenue, total: total.revenue },
      listens,
      conversionRate,
      trend: {
        tickets: { today: pctOrNull(today.tickets, ySame.tickets), week: pctChange(wk.tickets, pw.tickets), month: pctChange(mo.tickets, pm.tickets) },
        revenue: { today: pctOrNull(today.revenue, ySame.revenue), week: pctChange(wk.revenue, pw.revenue), month: pctChange(mo.revenue, pm.revenue) },
        previous: {
          tickets: { today: ySame.tickets, yesterdayFull: y.tickets, week: pw.tickets, month: pm.tickets },
          revenue: { today: ySame.revenue, yesterdayFull: y.revenue, week: pw.revenue, month: pm.revenue }
        }
      },
      topSites: [...perSite.values()].sort((a, b) => b.listens - a.listens || b.tickets - a.tickets),
      recentOrders: await tenantRepository.recentOrders(t, 10),
      includesDemoData: true
    };
  },

  async sales(scope, range = 'day') {
    if (scope.isSuper) return statsService.sales(range);
    if (!['day', 'week', 'month'].includes(range)) throw badRequest('range phải là day, week hoặc month');
    const now = Date.now();
    const today = vnDayStart(now);
    let buckets, from;
    if (range === 'day') {
      from = today;
      buckets = Array.from({ length: 24 }, (_, h) => ({ key: pad(h), label: `${pad(h)}h`, tickets: 0, revenue: 0, listens: 0 }));
    } else {
      const days = range === 'week' ? 7 : 30;
      from = today - (days - 1) * DAY_MS;
      buckets = Array.from({ length: days }, (_, i) => {
        const start = from + i * DAY_MS;
        const p = vnParts(start);
        return {
          key: vnDateKey(start),
          label: range === 'week' ? `${WEEKDAY_VI[p.weekday]} ${vnDayLabel(start)}` : vnDayLabel(start),
          tickets: 0,
          revenue: 0,
          listens: 0
        };
      });
    }
    const to = today + DAY_MS;
    const size = range === 'day' ? HOUR_MS : DAY_MS;
    const rows = await tenantRepository.paidBetween(scope.tenantId, from, to);
    const byPackage = new Map();
    const byMethod = new Map();
    for (const r of rows) {
      const idx = Math.floor((r.paid_ms - from) / size);
      if (idx >= 0 && idx < buckets.length) {
        buckets[idx].tickets++;
        buckets[idx].revenue += r.amount;
      }
      const pk = byPackage.get(r.package_id) || { packageId: r.package_id, name: r.package_name, tickets: 0, revenue: 0 };
      pk.tickets++;
      pk.revenue += r.amount;
      byPackage.set(r.package_id, pk);
      const m = byMethod.get(r.method) || { method: r.method, tickets: 0, revenue: 0 };
      m.tickets++;
      m.revenue += r.amount;
      byMethod.set(r.method, m);
    }
    const listens = (await listenRepository.between(from, to)).filter((l) => inSites(scope, l.site_id));
    for (const l of listens) {
      const idx = Math.floor((l.created_ms - from) / size);
      if (idx >= 0 && idx < buckets.length) buckets[idx].listens++;
    }
    return {
      range,
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      timezone: 'Asia/Ho_Chi_Minh',
      buckets,
      totals: { ...sumOrders(rows), listens: listens.length },
      byPackage: [...byPackage.values()].sort((a, b) => b.revenue - a.revenue),
      byMethod: [...byMethod.values()].sort((a, b) => b.revenue - a.revenue)
    };
  }
};
