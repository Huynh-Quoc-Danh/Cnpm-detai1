// DAL: orders (đơn hàng).
import { run, get, all } from '../db.js';

export function rowToOrder(r) {
  if (!r) return null;
  return {
    id: r.id,
    packageId: r.package_id,
    packageName: r.package_name,
    siteId: r.site_id,
    amount: r.amount,
    method: r.method,
    status: r.status,
    visitorId: r.visitor_id,
    lang: r.lang,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    createdAt: r.created_at,
    paidAt: r.paid_at,
    expiresAt: r.expires_at,
    transferNote: r.transfer_note,
    checkoutUrl: `/pay/${r.id}`,
    demo: !!r.demo
  };
}

const INSERT_SQL = `INSERT INTO orders (id, package_id, package_name, site_id, amount, method, status, visitor_id, lang,
  customer_name, customer_phone, created_at, created_ms, paid_at, paid_ms, expires_at, transfer_note, demo)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export const orderRepository = {
  async insert(o) {
    await run(INSERT_SQL, o.id, o.packageId, o.packageName, o.siteId ?? null, o.amount, o.method, o.status,
      o.visitorId ?? null, o.lang ?? null, o.customerName ?? null, o.customerPhone ?? null,
      o.createdAt, o.createdMs, o.paidAt ?? null, o.paidMs ?? null, o.expiresAt, o.transferNote, o.demo ? 1 : 0);
    return this.findById(o.id);
  },
  async findById(id) {
    return rowToOrder(await get('SELECT * FROM orders WHERE id = ?', id));
  },
  /** Same as findById but locks the row until the surrounding transaction ends (prevents double payment). */
  async findByIdForUpdate(id) {
    return rowToOrder(await get('SELECT * FROM orders WHERE id = ? FOR UPDATE', id));
  },
  async exists(id) {
    return !!(await get('SELECT 1 AS x FROM orders WHERE id = ?', id));
  },
  async setStatus(id, status, paid) {
    if (paid) {
      await run('UPDATE orders SET status = ?, paid_at = ?, paid_ms = ? WHERE id = ?', status, paid.paidAt, paid.paidMs, id);
    } else {
      await run('UPDATE orders SET status = ? WHERE id = ?', status, id);
    }
    return this.findById(id);
  },
  async setMethod(id, method) {
    await run('UPDATE orders SET method = ? WHERE id = ?', method, id);
  },
  async expireStale(nowIso) {
    return (await run(`UPDATE orders SET status = 'expired' WHERE status = 'pending' AND expires_at < ?`, nowIso)).changes;
  },
  async search({ status, fromMs, toMs, q, limit, offset }) {
    const where = [];
    const params = [];
    if (status) { where.push('status = ?'); params.push(status); }
    if (fromMs != null) { where.push('created_ms >= ?'); params.push(fromMs); }
    if (toMs != null) { where.push('created_ms < ?'); params.push(toMs); }
    if (q) {
      where.push('(id LIKE ? OR transfer_note LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR package_name LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like, like, like);
    }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const total = (await get(`SELECT COUNT(*) AS n FROM orders ${w}`, ...params)).n;
    const lim = limit != null ? `LIMIT ${Number(limit)} OFFSET ${Number(offset || 0)}` : '';
    const items = (await all(`SELECT * FROM orders ${w} ORDER BY created_ms DESC ${lim}`, ...params)).map(rowToOrder);
    return { items, total };
  },
  async recent(limit = 10) {
    return (await all('SELECT * FROM orders ORDER BY created_ms DESC LIMIT ?', Number(limit))).map(rowToOrder);
  },
  /** Raw paid-order rows with paid_ms in [fromMs, toMs) for statistics. */
  async paidBetween(fromMs, toMs) {
    return all(`SELECT id, package_id, package_name, site_id, amount, method, paid_ms FROM orders
      WHERE status = 'paid' AND paid_ms >= ? AND paid_ms < ?`, fromMs, toMs);
  },
  async paidTotals() {
    return get(`SELECT COUNT(*) AS tickets, COALESCE(SUM(amount), 0) AS revenue FROM orders WHERE status = 'paid'`);
  }
};
