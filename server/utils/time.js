// Time helpers. Business statistics are bucketed in Vietnam local time (Asia/Ho_Chi_Minh, UTC+7, no DST).
export const TZ = 'Asia/Ho_Chi_Minh';
export const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export const nowMs = () => Date.now();
export const iso = (ms = Date.now()) => new Date(ms).toISOString();

/** Epoch ms of local (VN) midnight for the day containing ms. */
export function vnDayStart(ms = Date.now()) {
  return Math.floor((ms + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS;
}

/** Local VN calendar parts for an epoch ms. */
export function vnParts(ms) {
  const d = new Date(ms + VN_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    weekday: d.getUTCDay() // 0 = Sunday
  };
}

const pad = (n) => String(n).padStart(2, '0');

export function vnDateKey(ms) {
  const p = vnParts(ms);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function vnDayLabel(ms) {
  const p = vnParts(ms);
  return `${pad(p.day)}/${pad(p.month)}`;
}

export function vnDateTime(ms) {
  const p = vnParts(ms);
  return `${pad(p.day)}/${pad(p.month)}/${p.year} ${pad(p.hour)}:${pad(p.minute)}`;
}

/** Parse "YYYY-MM-DD" as VN local midnight (epoch ms). Accepts full ISO strings too. */
export function parseVnDate(str) {
  if (!str) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str).trim());
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]) - VN_OFFSET_MS;
  const t = Date.parse(str);
  return Number.isFinite(t) ? t : null;
}

export const WEEKDAY_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
