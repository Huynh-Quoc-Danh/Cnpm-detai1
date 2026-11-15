// DAL: ban quản lý (tenant) và các truy vấn có lọc theo tenant cho trang quản trị.
// Mô hình shared database, shared schema: sites / packages / claim_codes có cột tenant_id;
// đơn hàng, lượt nghe, khách truy cập thuộc tenant thông qua địa điểm hoặc gói vé.
import { run, get, all } from '../db.js';
import { rowToOrder } from './orderRepository.js';

function rowToTenant(r) {
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    isActive: !!r.is_active,
    createdAt: r.created_at,
    siteCount: Number(r.site_count ?? 0),
    adminCount: Number(r.admin_count ?? 0),
    packageCount: Number(r.package_count ?? 0),
    codeCount: Number(r.code_count ?? 0)
  };
}

const SELECT_TENANT = `SELECT t.*,
  (SELECT COUNT(*) FROM sites s WHERE s.tenant_id = t.id) AS site_count,
  (SELECT COUNT(*) FROM admins a WHERE a.tenant_id = t.id) AS admin_count,
  (SELECT COUNT(*) FROM packages p WHERE p.tenant_id = t.id) AS package_count,
  (SELECT COUNT(*) FROM claim_codes c WHERE c.tenant_id = t.id) AS code_count
  FROM tenants t`;

// Đơn hàng thuộc tenant khi địa điểm của đơn thuộc tenant; đơn không gắn địa điểm (gói toàn tuyến) thì xét gói vé.
const ORDER_IN_TENANT = `(o.site_id IN (SELECT s.id FROM sites s WHERE s.tenant_id = ?)
  OR (o.site_id IS NULL AND o.package_id IN (SELECT p.id FROM packages p WHERE p.tenant_id = ?)))`;

function orderWhere(tenantId, { status, fromMs, toMs, q } = {}) {
  const where = [ORDER_IN_TENANT];
  const params = [tenantId, tenantId];
  if (status) { where.push('o.status = ?'); params.push(status); }
  if (fromMs != null) { where.push('o.created_ms >= ?'); params.push(fromMs); }
  if (toMs != null) { where.push('o.created_ms < ?'); params.push(toMs); }
  if (q) {
    where.push('(o.id LIKE ? OR o.transfer_note LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.package_name LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }
  return { sql: 'WHERE ' + where.join(' AND '), params };
}

export const tenantRepository = {
  // ---------- tenants ----------
  async findAll() {
    return (await all(`${SELECT_TENANT} ORDER BY t.id`)).map(rowToTenant);
  },
  async findById(id) {
    return rowToTenant(await get(`${SELECT_TENANT} WHERE t.id = ?`, id));
  },
  async findBySlug(slug) {
    return rowToTenant(await get(`${SELECT_TENANT} WHERE t.slug = ?`, slug));
  },
  async insert(t) {
    const r = await run('INSERT INTO tenants (slug, name, is_active, created_at) VALUES (?, ?, ?, ?)',
      t.slug, t.name, t.isActive ? 1 : 0, t.createdAt);
    return this.findById(Number(r.lastInsertRowid));
  },
  async update(id, t) {
    await run('UPDATE tenants SET slug = ?, name = ?, is_active = ? WHERE id = ?', t.slug, t.name, t.isActive ? 1 : 0, id);
    return this.findById(id);
  },
  async delete(id) {
    return (await run('DELETE FROM tenants WHERE id = ?', id)).changes > 0;
  },

  // ---------- địa điểm ----------
  async siteIds(tenantId) {
    return (await all('SELECT id FROM sites WHERE tenant_id = ? ORDER BY id', tenantId)).map((r) => r.id);
  },
  /** Map siteId -> tenantId của mọi địa điểm. */
  async siteOwners() {
    return new Map((await all('SELECT id, tenant_id FROM sites')).map((r) => [r.id, r.tenant_id]));
  },
  async siteTenant(siteId) {
    const r = await get('SELECT tenant_id FROM sites WHERE id = ?', siteId);
    return r ? r.tenant_id : null;
  },
  async setSitesTenant(siteIds, tenantId) {
    if (!siteIds.length) return 0;
    return (await run(`UPDATE sites SET tenant_id = ? WHERE id IN (${siteIds.map(() => '?').join(',')})`, tenantId, ...siteIds)).changes;
  },
  async exhibitSiteId(exhibitId) {
    const r = await get('SELECT site_id FROM exhibits WHERE id = ?', exhibitId);
    return r ? r.site_id : null;
  },

  // ---------- gói vé & mã kích hoạt ----------
  async packageIds(tenantId) {
    return (await all('SELECT id FROM packages WHERE tenant_id = ?', tenantId)).map((r) => r.id);
  },
  async packageOwners() {
    return new Map((await all('SELECT id, tenant_id FROM packages')).map((r) => [r.id, r.tenant_id]));
  },
  async packageTenant(id) {
    const r = await get('SELECT tenant_id FROM packages WHERE id = ?', id);
    return r ? r.tenant_id : null;
  },
  async setPackageTenant(id, tenantId) {
    await run('UPDATE packages SET tenant_id = ? WHERE id = ?', tenantId, id);
  },
  async codeOwners() {
    return new Map((await all('SELECT code, tenant_id FROM claim_codes')).map((r) => [r.code, r.tenant_id]));
  },
  async codeTenant(code) {
    const r = await get('SELECT tenant_id FROM claim_codes WHERE code = ?', code);
    return r ? r.tenant_id : null;
  },
  async setCodeTenant(code, tenantId) {
    await run('UPDATE claim_codes SET tenant_id = ? WHERE code = ?', tenantId, code);
  },

  // ---------- đơn hàng ----------
  async orderInTenant(orderId, tenantId) {
    return !!(await get(`SELECT 1 AS x FROM orders o WHERE o.id = ? AND ${ORDER_IN_TENANT}`, orderId, tenantId, tenantId));
  },
  async searchOrders(tenantId, { limit, offset, ...filters } = {}) {
    const w = orderWhere(tenantId, filters);
    const total = (await get(`SELECT COUNT(*) AS n FROM orders o ${w.sql}`, ...w.params)).n;
    const lim = limit != null ? `LIMIT ${Number(limit)} OFFSET ${Number(offset || 0)}` : '';
    const items = (await all(`SELECT o.* FROM orders o ${w.sql} ORDER BY o.created_ms DESC ${lim}`, ...w.params)).map(rowToOrder);
    return { items, total };
  },
  async orderIds(tenantId, filters = {}) {
    const w = orderWhere(tenantId, filters);
    return new Set((await all(`SELECT o.id FROM orders o ${w.sql}`, ...w.params)).map((r) => r.id));
  },
  async recentOrders(tenantId, limit = 10) {
    return (await all(`SELECT o.* FROM orders o WHERE ${ORDER_IN_TENANT} ORDER BY o.created_ms DESC LIMIT ?`,
      tenantId, tenantId, Number(limit))).map(rowToOrder);
  },
  /** Đơn đã thanh toán có paid_ms trong [fromMs, toMs) của tenant (cùng cột như orderRepository.paidBetween). */
  async paidBetween(tenantId, fromMs, toMs) {
    return all(`SELECT o.id, o.package_id, o.package_name, o.site_id, o.amount, o.method, o.paid_ms FROM orders o
      WHERE o.status = 'paid' AND o.paid_ms >= ? AND o.paid_ms < ? AND ${ORDER_IN_TENANT}`, fromMs, toMs, tenantId, tenantId);
  },
  async paidTotals(tenantId) {
    return get(`SELECT COUNT(*) AS tickets, COALESCE(SUM(o.amount), 0) AS revenue FROM orders o
      WHERE o.status = 'paid' AND ${ORDER_IN_TENANT}`, tenantId, tenantId);
  }
};
