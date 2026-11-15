// BLL: admin authentication (scrypt password hashing + random bearer session tokens, 12h expiry).
import crypto from 'node:crypto';
import { adminRepository, sessionRepository } from '../repositories/adminRepository.js';
import { badRequest, unauthorized } from '../utils/http.js';
import { newToken } from '../utils/ids.js';
import { iso } from '../utils/time.js';

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const KEYLEN = 64;

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, KEYLEN).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, admin) {
  const { hash } = hashPassword(password, admin.salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(admin.passwordHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function publicAdmin(a) {
  return a
    ? {
        id: a.id,
        username: a.username,
        displayName: a.displayName,
        role: a.role,
        tenantId: a.tenantId ?? null,
        tenantName: a.tenantName ?? null,
        lastLoginAt: a.lastLoginAt
      }
    : null;
}

/** Quản trị nền tảng: không thuộc ban quản lý (tenant) nào, thấy dữ liệu của mọi tenant. */
export const isSuperAdmin = (a) => !!a && a.tenantId == null;

export const adminAuthService = {
  async ensureDefaultAdmin() {
    if ((await adminRepository.count()) > 0) return;
    const { hash, salt } = hashPassword('admin123');
    await adminRepository.insert({
      username: 'admin',
      displayName: 'Quản trị viên',
      role: 'superadmin',
      tenantId: null,
      passwordHash: hash,
      salt,
      createdAt: iso()
    });
  },
  async login(username, password) {
    const u = String(username || '').trim().toLowerCase();
    if (!u || !password) throw badRequest('Vui lòng nhập tên đăng nhập và mật khẩu');
    const admin = await adminRepository.findByUsername(u);
    if (!admin || !verifyPassword(password, admin)) throw unauthorized('Sai tên đăng nhập hoặc mật khẩu');
    if (!admin.tenantActive) throw unauthorized('Ban quản lý của tài khoản này đang bị tạm khoá');
    const now = Date.now();
    await sessionRepository.purgeExpired(now);
    const token = newToken(32);
    await sessionRepository.insert(token, admin.id, iso(now), now + SESSION_TTL_MS);
    await adminRepository.touchLogin(admin.id, iso(now));
    return { token, admin: publicAdmin({ ...admin, lastLoginAt: iso(now) }), expiresAt: iso(now + SESSION_TTL_MS) };
  },
  async authenticate(token) {
    if (!token) return null;
    const s = await sessionRepository.find(token);
    if (!s) return null;
    if (s.expires_ms < Date.now()) {
      await sessionRepository.delete(token);
      return null;
    }
    const admin = await adminRepository.findById(s.admin_id);
    // Ban quản lý bị khoá thì mọi phiên của tài khoản thuộc ban đó hết hiệu lực ngay.
    return admin && admin.tenantActive ? admin : null;
  },
  async logout(token) {
    if (token) await sessionRepository.delete(token);
    return { ok: true };
  },
  async changePassword(admin, token, oldPassword, newPassword) {
    if (!verifyPassword(oldPassword || '', admin)) throw badRequest('Mật khẩu hiện tại không đúng');
    if (!newPassword || String(newPassword).length < 6) throw badRequest('Mật khẩu mới phải có ít nhất 6 ký tự');
    const { hash, salt } = hashPassword(newPassword);
    await adminRepository.setPassword(admin.id, hash, salt);
    await sessionRepository.deleteForAdmin(admin.id, token); // log out other sessions
    return { ok: true };
  }
};
