// DAL: tickets (vé điện tử) + claim codes (mã kích hoạt).
import { run, get, all, parseJson } from '../db.js';

export function rowToTicket(r) {
  if (!r) return null;
  return {
    token: r.token,
    orderId: r.order_id || null,
    code: r.code || null,
    scope: r.scope,
    siteIds: parseJson(r.site_ids, []),
    issuedAt: r.issued_at,
    expiresAt: r.expires_at,
    expiresMs: r.expires_ms,
    packageName: r.package_name,
    revoked: !!r.revoked
  };
}

export const ticketRepository = {
  async insert(t) {
    await run(`INSERT INTO tickets (token, order_id, code, scope, site_ids, issued_at, expires_at, expires_ms, package_name, visitor_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      t.token, t.orderId ?? null, t.code ?? null, t.scope, JSON.stringify(t.siteIds || []), t.issuedAt,
      t.expiresAt, t.expiresMs, t.packageName, t.visitorId ?? null);
    return this.findByToken(t.token);
  },
  async findByToken(token) {
    return rowToTicket(await get('SELECT * FROM tickets WHERE token = ?', token));
  },
  async findByOrder(orderId) {
    return rowToTicket(await get('SELECT * FROM tickets WHERE order_id = ? ORDER BY issued_at DESC LIMIT 1', orderId));
  },
  async setRevokedByOrder(orderId, revoked) {
    return (await run('UPDATE tickets SET revoked = ? WHERE order_id = ?', revoked ? 1 : 0, orderId)).changes;
  }
};

function rowToCode(r) {
  if (!r) return null;
  return {
    code: r.code,
    scope: r.scope,
    siteIds: parseJson(r.site_ids, []),
    durationHours: r.duration_hours,
    maxUses: r.max_uses,
    usedCount: r.used_count,
    isActive: !!r.is_active,
    note: r.note || '',
    createdAt: r.created_at
  };
}

export const codeRepository = {
  async findAll() {
    return (await all('SELECT * FROM claim_codes ORDER BY created_at DESC, code')).map(rowToCode);
  },
  async findByCode(code) {
    return rowToCode(await get('SELECT * FROM claim_codes WHERE code = ?', code));
  },
  async insert(c) {
    await run(`INSERT INTO claim_codes (code, scope, site_ids, duration_hours, max_uses, used_count, is_active, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      c.code, c.scope, JSON.stringify(c.siteIds || []), c.durationHours, c.maxUses, c.usedCount || 0,
      c.isActive !== false, c.note || '', c.createdAt);
    return this.findByCode(c.code);
  },
  async update(code, c) {
    await run(`UPDATE claim_codes SET scope = ?, site_ids = ?, duration_hours = ?, max_uses = ?, used_count = ?,
         is_active = ?, note = ? WHERE code = ?`,
      c.scope, JSON.stringify(c.siteIds || []), c.durationHours, c.maxUses, c.usedCount || 0,
      c.isActive !== false, c.note || '', code);
    return this.findByCode(code);
  },
  /** Atomically consume one use; false if exhausted. */
  async incrementUse(code) {
    return (await run('UPDATE claim_codes SET used_count = used_count + 1 WHERE code = ? AND used_count < max_uses', code)).changes > 0;
  },
  async delete(code) {
    return (await run('DELETE FROM claim_codes WHERE code = ?', code)).changes > 0;
  }
};
