// BLL: dashboard statistics. All day/week/month windows use Vietnam local time (UTC+7).
import { orderRepository } from '../repositories/orderRepository.js';
import { listenRepository } from '../repositories/visitorRepository.js';
import { siteRepository } from '../repositories/siteRepository.js';
import { visitorService } from './visitorService.js';
import { orderService } from './orderService.js';
import { badRequest } from '../utils/http.js';
import { vnDayStart, vnParts, vnDayLabel, vnDateKey, DAY_MS, HOUR_MS, WEEKDAY_VI } from '../utils/time.js';

const pad = (n) => String(n).padStart(2, '0');

/** [from, to) windows. today = since local midnight; week = last 7 local days incl. today; month = last 30. */
export function windows(now = Date.now()) {
  const today = vnDayStart(now);
  const end = today + DAY_MS;
  return {
    today: { from: today, to: end },
    week: { from: today - 6 * DAY_MS, to: end },
    month: { from: today - 29 * DAY_MS, to: end },
    yesterday: { from: today - DAY_MS, to: today },
    prevWeek: { from: today - 13 * DAY_MS, to: today - 6 * DAY_MS },
    prevMonth: { from: today - 59 * DAY_MS, to: today - 29 * DAY_MS }
  };
}

function sumOrders(rows) {
  return { tickets: rows.length, revenue: rows.reduce((a, r) => a + r.amount, 0) };
}

function pctChange(cur, prev) {
  if (!prev) return cur ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

export const statsService = {
  async overview() {
    const now = Date.now();
    const w = windows(now);
    const monthRows = await orderRepository.paidBetween(w.month.from, w.month.to);
    const inRange = (r, win) => r.paid_ms >= win.from && r.paid_ms < win.to;
    const t = sumOrders(monthRows.filter((r) => inRange(r, w.today)));
    const wk = sumOrders(monthRows.filter((r) => inRange(r, w.week)));
    const mo = sumOrders(monthRows);
    const total = await orderRepository.paidTotals();
    const prevRows = await orderRepository.paidBetween(w.prevMonth.from, w.month.from);
    const yRows = await orderRepository.paidBetween(w.yesterday.from, w.yesterday.to);
    const pwRows = await orderRepository.paidBetween(w.prevWeek.from, w.prevWeek.to);
    const y = sumOrders(yRows), pw = sumOrders(pwRows), pm = sumOrders(prevRows);
    // "Hôm nay" so với hôm qua TÍNH ĐẾN CÙNG GIỜ (không so nửa ngày với cả ngày hôm qua).
    const sameTimeCut = w.yesterday.from + (now - w.today.from);
    const ySame = sumOrders(yRows.filter((r) => r.paid_ms < sameTimeCut));
    const pctOrNull = (cur, prev) => (prev ? pctChange(cur, prev) : null);

    const listensMonth = await listenRepository.between(w.month.from, w.month.to);
    const listens = {
      today: listensMonth.filter((l) => l.created_ms >= w.today.from).length,
      week: listensMonth.filter((l) => l.created_ms >= w.week.from).length,
      month: listensMonth.length
    };
    const listeners = new Set(listensMonth.map((l) => l.visitor_id).filter(Boolean)).size;
    const conversionRate = listeners ? Math.round((mo.tickets / listeners) * 1000) / 10 : 0;

    const sites = await siteRepository.findAll({ includeInactive: true });
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
    const topSites = [...perSite.values()].sort((a, b) => b.listens - a.listens || b.tickets - a.tickets);

    const live = await visitorService.live();
    return {
      generatedAt: new Date(now).toISOString(),
      timezone: 'Asia/Ho_Chi_Minh',
      liveTotal: live.liveTotal,
      liveReal: live.liveReal,
      liveSimulated: live.liveSimulated,
      livePerSite: live.perSite.map((p) => ({ siteId: p.siteId, nameVi: siteName.get(p.siteId) || p.nameVi, count: p.count, real: p.real, simulated: p.simulated })),
      tickets: { today: t.tickets, week: wk.tickets, month: mo.tickets, total: total.tickets },
      revenue: { today: t.revenue, week: wk.revenue, month: mo.revenue, total: total.revenue },
      listens,
      conversionRate,
      trend: {
        tickets: { today: pctOrNull(t.tickets, ySame.tickets), week: pctChange(wk.tickets, pw.tickets), month: pctChange(mo.tickets, pm.tickets) },
        revenue: { today: pctOrNull(t.revenue, ySame.revenue), week: pctChange(wk.revenue, pw.revenue), month: pctChange(mo.revenue, pm.revenue) },
        previous: {
          tickets: { today: ySame.tickets, yesterdayFull: y.tickets, week: pw.tickets, month: pm.tickets },
          revenue: { today: ySame.revenue, yesterdayFull: y.revenue, week: pw.revenue, month: pm.revenue }
        }
      },
      topSites,
      recentOrders: await orderService.recent(10),
      includesDemoData: true
    };
  },

  async sales(range = 'day') {
    if (!['day', 'week', 'month'].includes(range)) throw badRequest('range phải là day, week hoặc month');
    const now = Date.now();
    const today = vnDayStart(now);
    let buckets;
    let from, to;
    if (range === 'day') {
      from = today;
      to = today + DAY_MS;
      buckets = Array.from({ length: 24 }, (_, h) => ({
        key: `${pad(h)}`,
        label: `${pad(h)}h`,
        from: today + h * HOUR_MS,
        tickets: 0,
        revenue: 0
      }));
    } else {
      const days = range === 'week' ? 7 : 30;
      from = today - (days - 1) * DAY_MS;
      to = today + DAY_MS;
      buckets = Array.from({ length: days }, (_, i) => {
        const start = from + i * DAY_MS;
        const p = vnParts(start);
        return {
          key: vnDateKey(start),
          label: range === 'week' ? `${WEEKDAY_VI[p.weekday]} ${vnDayLabel(start)}` : vnDayLabel(start),
          from: start,
          tickets: 0,
          revenue: 0
        };
      });
    }
    const size = range === 'day' ? HOUR_MS : DAY_MS;
    const rows = await orderRepository.paidBetween(from, to);
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
    const listens = await listenRepository.between(from, to);
    for (const b of buckets) b.listens = 0;
    for (const l of listens) {
      const idx = Math.floor((l.created_ms - from) / size);
      if (idx >= 0 && idx < buckets.length) buckets[idx].listens++;
    }
    const totals = sumOrders(rows);
    return {
      range,
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      timezone: 'Asia/Ho_Chi_Minh',
      buckets: buckets.map(({ from: f, ...b }) => b),
      totals: { ...totals, listens: listens.length },
      byPackage: [...byPackage.values()].sort((a, b) => b.revenue - a.revenue),
      byMethod: [...byMethod.values()].sort((a, b) => b.revenue - a.revenue)
    };
  }
};
