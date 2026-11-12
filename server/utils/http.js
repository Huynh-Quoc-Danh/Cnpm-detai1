export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const badRequest = (msg) => new HttpError(400, msg);
export const notFound = (msg = 'Không tìm thấy dữ liệu') => new HttpError(404, msg);
export const unauthorized = (msg = 'Chưa đăng nhập hoặc phiên đã hết hạn') => new HttpError(401, msg);
export const conflict = (msg) => new HttpError(409, msg);

export function bearerToken(req) {
  const h = req.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

export function toInt(v, fallback = null) {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function toNum(v, fallback = null) {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function toBool(v, fallback = false) {
  if (v === undefined || v === null) return fallback;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}
