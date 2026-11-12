// DAL: sites + exhibits (rich content stored as JSON documents, key fields as columns).
import { run, get, all, parseJson } from '../db.js';
import { iso } from '../utils/time.js';

function rowToSite(row) {
  if (!row) return null;
  const data = parseJson(row.data, {});
  return { ...data, id: row.id, slug: row.slug, nameVi: row.name_vi, isActive: !!row.is_active };
}

function rowToExhibit(row) {
  if (!row) return null;
  const data = parseJson(row.data, {});
  return { ...data, id: row.id, siteId: row.site_id, sortOrder: row.sort_order };
}

export const siteRepository = {
  async findAll({ includeInactive = false } = {}) {
    const rows = includeInactive
      ? await all('SELECT * FROM sites ORDER BY id')
      : await all('SELECT * FROM sites WHERE is_active = 1 ORDER BY id');
    return rows.map(rowToSite);
  },
  async findById(id) {
    return rowToSite(await get('SELECT * FROM sites WHERE id = ?', id));
  },
  async exists(id) {
    return !!(await get('SELECT 1 AS x FROM sites WHERE id = ?', id));
  },
  async nextId() {
    return (await get('SELECT COALESCE(MAX(id), 0) + 1 AS n FROM sites')).n;
  },
  async upsert(site) {
    const { exhibits, ...rest } = site;
    const now = iso();
    const existing = await get('SELECT created_at FROM sites WHERE id = ?', site.id);
    await run(
      `INSERT INTO sites (id, slug, name_vi, is_active, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE slug = VALUES(slug), name_vi = VALUES(name_vi),
         is_active = VALUES(is_active), data = VALUES(data), updated_at = VALUES(updated_at)`,
      site.id, site.slug, site.nameVi, site.isActive !== false, JSON.stringify(rest),
      existing ? existing.created_at : now, now
    );
    return this.findById(site.id);
  },
  async delete(id) {
    await run('DELETE FROM exhibits WHERE site_id = ?', id);
    return (await run('DELETE FROM sites WHERE id = ?', id)).changes > 0;
  },
  async count({ includeInactive = false } = {}) {
    return (await get(`SELECT COUNT(*) AS n FROM sites ${includeInactive ? '' : 'WHERE is_active = 1'}`)).n;
  }
};

export const exhibitRepository = {
  async findBySite(siteId) {
    return (await all('SELECT * FROM exhibits WHERE site_id = ? ORDER BY sort_order, id', siteId)).map(rowToExhibit);
  },
  async findById(id) {
    return rowToExhibit(await get('SELECT * FROM exhibits WHERE id = ?', id));
  },
  async nextIdForSite(siteId) {
    const rows = await all('SELECT id FROM exhibits WHERE site_id = ?', siteId);
    let max = 0;
    for (const r of rows) {
      const m = /-e(\d+)$/.exec(r.id);
      if (m) max = Math.max(max, Number(m[1]));
    }
    let candidate = `s${siteId}-e${max + 1}`;
    while (await this.findById(candidate)) candidate = `s${siteId}-e${++max + 1}`;
    return candidate;
  },
  async maxSortOrder(siteId) {
    return (await get('SELECT COALESCE(MAX(sort_order), 0) AS m FROM exhibits WHERE site_id = ?', siteId)).m;
  },
  async upsert(exhibit) {
    const { id, siteId, sortOrder, ...rest } = exhibit;
    await run(
      `INSERT INTO exhibits (id, site_id, sort_order, data, updated_at) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE site_id = VALUES(site_id), sort_order = VALUES(sort_order),
         data = VALUES(data), updated_at = VALUES(updated_at)`,
      id, siteId, sortOrder ?? 0, JSON.stringify(rest), iso()
    );
    return this.findById(id);
  },
  async delete(id) {
    return (await run('DELETE FROM exhibits WHERE id = ?', id)).changes > 0;
  },
  async deleteBySite(siteId) {
    await run('DELETE FROM exhibits WHERE site_id = ?', siteId);
  }
};
