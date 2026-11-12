// BLL: base64 file uploads (images / audio) stored under server/uploads, served at /uploads.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { UPLOAD_DIR } from '../db.js';
import { badRequest } from '../utils/http.js';

const ALLOWED = {
  image: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  audio: ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.oga', '.webm']
};
const MAX_BYTES = { image: 10 * 1024 * 1024, audio: 30 * 1024 * 1024 };

export const uploadService = {
  save({ filename, dataBase64, kind }) {
    if (!['image', 'audio'].includes(kind)) throw badRequest('kind phải là "image" hoặc "audio"');
    if (!filename || !dataBase64) throw badRequest('Thiếu filename hoặc dataBase64');
    const ext = path.extname(String(filename)).toLowerCase();
    if (!ALLOWED[kind].includes(ext)) throw badRequest(`Định dạng ${ext || '(trống)'} không được hỗ trợ cho ${kind}`);
    const b64 = String(dataBase64).replace(/^data:[^;]+;base64,/, '');
    const buf = Buffer.from(b64, 'base64');
    if (!buf.length) throw badRequest('Dữ liệu tệp trống');
    if (buf.length > MAX_BYTES[kind]) throw badRequest(`Tệp quá lớn (tối đa ${MAX_BYTES[kind] / 1024 / 1024} MB)`);
    const base = path.basename(String(filename), path.extname(String(filename)))
      .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
      .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || kind;
    const name = `${Date.now()}-${crypto.randomBytes(kind === 'audio' ? 12 : 3).toString('hex')}-${base}${ext}`;
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
    return { url: `/uploads/${name}`, size: buf.length };
  }
};
