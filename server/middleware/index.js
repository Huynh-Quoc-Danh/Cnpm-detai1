// Cross-cutting middleware: CORS, admin auth guard, 404 + error handler.
import { adminAuthService, publicAdmin } from '../services/adminAuthService.js';
import { HttpError, bearerToken, unauthorized } from '../utils/http.js';

export function cors(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', req.get('origin') || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Visitor-Id');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

export async function requireAdmin(req, res, next) {
  const token = bearerToken(req);
  const admin = await adminAuthService.authenticate(token);
  if (!admin) return next(unauthorized());
  req.admin = admin;
  req.adminPublic = publicAdmin(admin);
  req.adminToken = token;
  next();
}

export function apiNotFound(req, res) {
  res.status(404).json({ error: `Không tìm thấy API: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'Dữ liệu gửi lên quá lớn' });
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON không hợp lệ' });
  const status = err instanceof HttpError ? err.status : err && Number.isInteger(err.status) ? err.status : 500;
  if (status >= 500) console.error('[api] error', err);
  res.status(status).json({ error: status >= 500 ? 'Lỗi máy chủ, vui lòng thử lại' : err.message });
}
