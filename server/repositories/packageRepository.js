// DAL: ticket packages (gói vé).
import { run, get, all } from '../db.js';

function rowToPackage(r) {
  if (!r) return null;
  return {
    id: r.id,
    code: r.code,
    nameVi: r.name_vi,
    nameEn: r.name_en,
    descVi: r.desc_vi,
    descEn: r.desc_en,
    price: r.price,
    scope: r.scope,
    durationHours: r.duration_hours,
    maxPeople: r.max_people,
    isActive: !!r.is_active,
    badgeVi: r.badge_vi || null,
    badgeEn: r.badge_en || null,
    sortOrder: r.sort_order
  };
}

function values(p) {
  return [
    p.code, p.nameVi, p.nameEn, p.descVi || '', p.descEn || '', p.price, p.scope, p.durationHours,
    p.maxPeople || 1, p.isActive !== false, p.badgeVi || null, p.badgeEn || null, p.sortOrder || 0
  ];
}

export const packageRepository = {
  async findAll({ includeInactive = false } = {}) {
    const where = includeInactive ? '' : 'WHERE is_active = 1';
    return (await all(`SELECT * FROM packages ${where} ORDER BY sort_order, price, id`)).map(rowToPackage);
  },
  async findById(id) {
    return rowToPackage(await get('SELECT * FROM packages WHERE id = ?', id));
  },
  async findByCode(code) {
    return rowToPackage(await get('SELECT * FROM packages WHERE code = ?', code));
  },
  async insert(p) {
    const r = await run(
      `INSERT INTO packages (code, name_vi, name_en, desc_vi, desc_en, price, scope, duration_hours, max_people,
         is_active, badge_vi, badge_en, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ...values(p)
    );
    return this.findById(Number(r.lastInsertRowid));
  },
  async update(id, p) {
    await run(
      `UPDATE packages SET code = ?, name_vi = ?, name_en = ?, desc_vi = ?, desc_en = ?, price = ?, scope = ?,
         duration_hours = ?, max_people = ?, is_active = ?, badge_vi = ?, badge_en = ?, sort_order = ? WHERE id = ?`,
      ...values(p), id
    );
    return this.findById(id);
  },
  async delete(id) {
    return (await run('DELETE FROM packages WHERE id = ?', id)).changes > 0;
  }
};
