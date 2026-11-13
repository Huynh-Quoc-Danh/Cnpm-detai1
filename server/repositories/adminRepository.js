// DAL: admin accounts, admin sessions and key/value settings.
import { run, get, all, parseJson } from '../db.js';

function rowToAdmin(r) {
  if (!r) return null;
  return {
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    role: r.role,
    passwordHash: r.password_hash,
    salt: r.salt,
    createdAt: r.created_at,
    lastLoginAt: r.last_login_at
  };
}

export const adminRepository = {
  async findByUsername(username) {
    return rowToAdmin(await get('SELECT * FROM admins WHERE username = ?', username));
  },
  async findById(id) {
    return rowToAdmin(await get('SELECT * FROM admins WHERE id = ?', id));
  },
  async count() {
    return (await get('SELECT COUNT(*) AS n FROM admins')).n;
  },
  async insert(a) {
    const r = await run(`INSERT INTO admins (username, display_name, role, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      a.username, a.displayName, a.role || 'admin', a.passwordHash, a.salt, a.createdAt);
    return this.findById(Number(r.lastInsertRowid));
  },
  async setPassword(id, passwordHash, salt) {
    await run('UPDATE admins SET password_hash = ?, salt = ? WHERE id = ?', passwordHash, salt, id);
  },
  async touchLogin(id, at) {
    await run('UPDATE admins SET last_login_at = ? WHERE id = ?', at, id);
  }
};

export const sessionRepository = {
  async insert(token, adminId, createdAt, expiresMs) {
    await run('INSERT INTO admin_sessions (token, admin_id, created_at, expires_ms) VALUES (?, ?, ?, ?)', token, adminId, createdAt, expiresMs);
  },
  async find(token) {
    return (await get('SELECT * FROM admin_sessions WHERE token = ?', token)) || null;
  },
  async delete(token) {
    await run('DELETE FROM admin_sessions WHERE token = ?', token);
  },
  async deleteForAdmin(adminId, exceptToken) {
    await run('DELETE FROM admin_sessions WHERE admin_id = ? AND token != ?', adminId, exceptToken || '');
  },
  async purgeExpired(nowMs) {
    await run('DELETE FROM admin_sessions WHERE expires_ms < ?', nowMs);
  }
};

// `key` is a reserved word in MySQL, so it is always quoted with backticks.
export const settingsRepository = {
  async get(key, fallback = null) {
    const r = await get('SELECT value FROM settings WHERE `key` = ?', key);
    return r ? parseJson(r.value, fallback) : fallback;
  },
  async set(key, value) {
    await run('INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
      key, JSON.stringify(value));
  },
  async all() {
    const out = {};
    for (const r of await all('SELECT `key`, value FROM settings')) out[r.key] = parseJson(r.value, null);
    return out;
  }
};
