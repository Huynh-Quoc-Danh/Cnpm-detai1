// Tiện ích định dạng & hằng số dùng chung cho trang quản trị.
import type React from 'react';
import type { LanguageCode, OrderStatus, PaymentMethod, VisitorSource } from '../types';
import { formatVnd } from '../services/api';
import { UNITS_PER_MINUTE, countUnits, estimateDurationSec } from '../i18n';

export { formatVnd };

const TZ = 'Asia/Ho_Chi_Minh';
const nf = new Intl.NumberFormat('vi-VN');

export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

export const fmtNum = (n: number | null | undefined) => nf.format(Math.round(Number(n) || 0));

export const fmtPct = (n: number | null | undefined, digits = 1) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(Number(n) || 0) + '%';

/** 13 830 000 -> "13,8 tr" (dùng cho trục biểu đồ). */
export function fmtCompactVnd(n: number): string {
  const v = Math.abs(n || 0);
  const f = (x: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(x);
  if (v >= 1e9) return f(n / 1e9) + ' tỷ';
  if (v >= 1e6) return f(n / 1e6) + ' tr';
  if (v >= 1e3) return f(n / 1e3) + 'k';
  return f(n);
}

export function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function fmtTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('vi-VN', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function fmtLongDate(d = new Date()): string {
  const s = d.toLocaleDateString('vi-VN', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 5) return 'vừa xong';
  if (s < 60) return `${s} giây trước`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

/** 211 -> "3:31" */
export function fmtClock(sec: number | null | undefined): string {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function fmtHours(h: number): string {
  if (!h) return '—';
  if (h % 24 === 0) return `${h / 24} ngày`;
  return `${h} giờ`;
}

/** Ngày theo giờ Việt Nam, dạng YYYY-MM-DD (dùng cho bộ lọc). */
export function localDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

// ---- Thuyết minh: số từ/ký tự & thời lượng ước tính (khớp server/utils/text.js) ----
// vi 165 từ/phút, en 150 từ/phút, ko 300 âm tiết/phút, ja 340 ký tự/phút, zh 250 ký tự/phút.
export const WORDS_PER_MIN: Record<LanguageCode, number> = UNITS_PER_MINUTE;
export const countWords = (text: string) => (text || '').trim().split(/\s+/).filter(Boolean).length;
/** Đơn vị đếm theo ngôn ngữ: từ (vi/en), ký tự không tính dấu câu & khoảng trắng (ko/ja/zh). */
export const countTextUnits = (text: string, lang: LanguageCode) => countUnits(text, lang);
export const estimateSec = (text: string, lang: LanguageCode) => estimateDurationSec(text, lang);

// ---- Nhãn & màu ----
export type Tone = 'slate' | 'sky' | 'teal' | 'green' | 'amber' | 'red' | 'violet' | 'orange';

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone; icon: string }> = {
  pending: { label: 'Chờ thanh toán', tone: 'amber', icon: 'fa-hourglass-half' },
  paid: { label: 'Đã thanh toán', tone: 'green', icon: 'fa-circle-check' },
  expired: { label: 'Hết hạn', tone: 'slate', icon: 'fa-clock' },
  refunded: { label: 'Đã hoàn tiền', tone: 'violet', icon: 'fa-rotate-left' },
  cancelled: { label: 'Đã hủy', tone: 'red', icon: 'fa-ban' }
};

export const PAY_METHOD: Record<PaymentMethod, { label: string; icon: string }> = {
  vietqr: { label: 'VietQR', icon: 'fa-qrcode' },
  momo: { label: 'Ví MoMo', icon: 'fa-wallet' },
  card: { label: 'Thẻ ngân hàng', icon: 'fa-credit-card' }
};

/** Bảng màu phân loại (thứ tự cố định, không xoay vòng). */
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];

export const VISITOR_SOURCE: Record<VisitorSource, { label: string; color: string; icon: string }> = {
  gps: { label: 'GPS thực', color: SERIES[0], icon: 'fa-location-crosshairs' },
  qr: { label: 'Quét QR', color: SERIES[1], icon: 'fa-qrcode' },
  sim: { label: 'Mô phỏng', color: SERIES[2], icon: 'fa-robot' },
  view: { label: 'Xem online', color: '#94a3b8', icon: 'fa-eye' }
};

export const LANG_LABEL: Record<string, string> = { vi: 'Tiếng Việt', en: 'Tiếng Anh', ko: 'Tiếng Hàn', ja: 'Tiếng Nhật', zh: 'Tiếng Trung' };
export const LANG_FLAG: Record<string, string> = { vi: '🇻🇳', en: '🇬🇧', ko: '🇰🇷', ja: '🇯🇵', zh: '🇨🇳' };

export const CATEGORY_OPTIONS = [
  { key: 'Iconic', vi: 'Biểu tượng', en: 'Iconic' },
  { key: 'Unique Rock', vi: 'Đá độc đáo', en: 'Unique Rock' },
  { key: 'Island', vi: 'Đảo', en: 'Island' },
  { key: 'Natural', vi: 'Thiên nhiên', en: 'Natural' }
] as const;

/** Khung toạ độ hợp lý của Vịnh Hạ Long – Bái Tử Long (để cảnh báo nhập sai). */
export const HALONG_BOUNDS = { minLat: 20.7, maxLat: 21.15, minLng: 106.85, maxLng: 107.55 };
export const HALONG_CENTER: [number, number] = [20.9, 107.05];
export const inHalong = (lat: number, lng: number) =>
  lat >= HALONG_BOUNDS.minLat && lat <= HALONG_BOUNDS.maxLat && lng >= HALONG_BOUNDS.minLng && lng <= HALONG_BOUNDS.maxLng;

export function randomCode(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) s += chars[arr[i] % chars.length];
  return s;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Xuất CSV (UTF-8 BOM để Excel đọc đúng tiếng Việt). */
export function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number>>): void {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  downloadBlob(new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' }), filename);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

export function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

/** Ảnh hiển thị: ưu tiên ảnh nội bộ, lỗi thì dùng fallback. */
export function onImgError(fallback?: string) {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (fallback && img.dataset.fb !== '1') {
      img.dataset.fb = '1';
      img.src = fallback;
    } else {
      img.style.visibility = 'hidden';
    }
  };
}

/** Khoảng cách (m) giữa 2 toạ độ. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const fmtMeters = (m: number) => (m >= 1000 ? `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(m / 1000)} km` : `${Math.round(m)} m`);
