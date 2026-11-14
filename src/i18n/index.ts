// i18n helpers for the visitor app: language list, tr()/trf() string pickers and localized
// site / exhibit field accessors (fallback for a missing ko/ja/zh value: en, then vi).
import type {
  Exhibit,
  ExtraLanguageCode,
  HeritageSite,
  LanguageCode,
  LocalizedText
} from '../types';

export { FlagIcon } from './FlagIcon';

export interface LanguageMeta {
  code: LanguageCode;
  /** Name in its own language (shown in the language picker). */
  native: string;
  short: 'VI' | 'EN' | 'KO' | 'JA' | 'ZH';
  bcp47: 'vi-VN' | 'en-US' | 'ko-KR' | 'ja-JP' | 'zh-CN';
  /** Intl locale (same as bcp47). */
  locale: 'vi-VN' | 'en-US' | 'ko-KR' | 'ja-JP' | 'zh-CN';
  /** Vietnamese name (admin portal labels). */
  viName: string;
}

/** Order everywhere: vi, en, ko, ja, zh. Vietnamese is the default. */
export const LANGUAGES: LanguageMeta[] = [
  { code: 'vi', native: 'Tiếng Việt', short: 'VI', bcp47: 'vi-VN', locale: 'vi-VN', viName: 'Tiếng Việt' },
  { code: 'en', native: 'English', short: 'EN', bcp47: 'en-US', locale: 'en-US', viName: 'Tiếng Anh' },
  { code: 'ko', native: '한국어', short: 'KO', bcp47: 'ko-KR', locale: 'ko-KR', viName: 'Tiếng Hàn' },
  { code: 'ja', native: '日本語', short: 'JA', bcp47: 'ja-JP', locale: 'ja-JP', viName: 'Tiếng Nhật' },
  { code: 'zh', native: '中文', short: 'ZH', bcp47: 'zh-CN', locale: 'zh-CN', viName: 'Tiếng Trung' }
];

export const LANGUAGE_CODES: LanguageCode[] = LANGUAGES.map((l) => l.code);
export const EXTRA_LANGUAGES: ExtraLanguageCode[] = ['ko', 'ja', 'zh'];
export const DEFAULT_LANGUAGE: LanguageCode = 'vi';

export function isLanguageCode(x: unknown): x is LanguageCode {
  return typeof x === 'string' && (LANGUAGE_CODES as string[]).includes(x);
}

export function languageMeta(lang: LanguageCode): LanguageMeta {
  return LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
}

export const isCjk = (lang: LanguageCode): boolean => lang === 'ko' || lang === 'ja' || lang === 'zh';

/** Fallback chain for a language: lang -> en -> vi. */
export function fallbackChain(lang: LanguageCode): LanguageCode[] {
  return Array.from(new Set<LanguageCode>([lang, 'en', 'vi']));
}

export type TrMap = { vi: string; en: string; ko?: string; ja?: string; zh?: string };

/** Pick the string for `lang` (missing -> en -> vi). */
export function tr(lang: LanguageCode, m: TrMap): string {
  const v = m[lang];
  if (v != null && v !== '') return v;
  return m.en != null && m.en !== '' ? m.en : m.vi;
}

/** tr() + "{name}" interpolation. */
export function trf(lang: LanguageCode, m: TrMap, vars: Record<string, string | number>): string {
  return tr(lang, m).replace(/\{(\w+)\}/g, (all, k) => (k in vars ? String(vars[k]) : all));
}

/** First non-empty value of a LocalizedText along lang -> en -> vi (numbers: first > 0). */
export function pickLocalized<T>(m: Partial<Record<LanguageCode, T>> | null | undefined, lang: LanguageCode): T | undefined {
  if (!m) return undefined;
  for (const l of fallbackChain(lang)) {
    const v = m[l];
    if (v == null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (typeof v === 'number' && !(v > 0)) continue;
    return v;
  }
  return undefined;
}

/** Language whose narration text will actually be used for `lang` (lang -> en -> vi). */
export function narrationLang(narration: LocalizedText | null | undefined, lang: LanguageCode): LanguageCode {
  if (!narration) return lang;
  return fallbackChain(lang).find((l) => (narration[l] || '').trim()) || lang;
}

/** Full narration duration (sec) for `lang`, falling back like the server does. */
export function narrationDuration(obj: { durationSec?: LocalizedText<number> } | null | undefined, lang: LanguageCode): number {
  return pickLocalized(obj?.durationSec, lang) || 0;
}

// ---------------- site / exhibit fields ----------------
export type SiteTextField = 'province' | 'year' | 'category' | 'shortDesc' | 'history' | 'geology';

const nonEmpty = (s: string | null | undefined): s is string => !!s && s.trim() !== '';

function firstOf(...xs: Array<string | null | undefined>): string {
  for (const x of xs) if (nonEmpty(x)) return x;
  return '';
}

export function siteName(site: HeritageSite | null | undefined, lang: LanguageCode): string {
  if (!site) return '';
  if (lang === 'vi') return firstOf(site.nameVi, site.name);
  if (lang === 'en') return firstOf(site.name, site.nameVi);
  return firstOf(site.translations?.[lang]?.name, site.name, site.nameVi);
}

export function siteText(site: HeritageSite | null | undefined, lang: LanguageCode, field: SiteTextField): string {
  if (!site) return '';
  const vi = (site as unknown as Record<string, string>)[`${field}Vi`];
  const en = (site as unknown as Record<string, string>)[`${field}En`];
  if (lang === 'vi') return firstOf(vi, en);
  if (lang === 'en') return firstOf(en, vi);
  return firstOf(site.translations?.[lang]?.[field], en, vi);
}

export function siteHighlights(site: HeritageSite | null | undefined, lang: LanguageCode): string[] {
  if (!site) return [];
  const vi = site.highlightsVi || [];
  const en = site.highlightsEn || [];
  if (lang === 'vi') return vi.length ? vi : en;
  if (lang === 'en') return en.length ? en : vi;
  const t = site.translations?.[lang]?.highlights || [];
  return t.length ? t : en.length ? en : vi;
}

export function exhibitName(ex: Exhibit | null | undefined, lang: LanguageCode): string {
  if (!ex) return '';
  if (lang === 'vi') return firstOf(ex.nameVi, ex.nameEn);
  if (lang === 'en') return firstOf(ex.nameEn, ex.nameVi);
  return firstOf(ex.translations?.[lang]?.name, ex.nameEn, ex.nameVi);
}

export function exhibitZone(ex: Exhibit | null | undefined, lang: LanguageCode): string {
  if (!ex) return '';
  if (lang === 'vi') return firstOf(ex.zoneVi, ex.zoneEn);
  if (lang === 'en') return firstOf(ex.zoneEn, ex.zoneVi);
  return firstOf(ex.translations?.[lang]?.zone, ex.zoneEn, ex.zoneVi);
}

export function exhibitShortDesc(ex: Exhibit | null | undefined, lang: LanguageCode): string {
  if (!ex) return '';
  if (lang === 'vi') return firstOf(ex.shortDescVi, ex.shortDescEn);
  if (lang === 'en') return firstOf(ex.shortDescEn, ex.shortDescVi);
  return firstOf(ex.translations?.[lang]?.shortDesc, ex.shortDescEn, ex.shortDescVi);
}

// ---------------- numbers / durations ----------------
export function numberLocale(lang: LanguageCode): LanguageMeta['bcp47'] {
  return languageMeta(lang).bcp47;
}

/** "m:ss" */
export function formatDurationLabel(sec: number): string {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Localized "≈ N min" style label. */
export function formatMinutes(lang: LanguageCode, sec: number): string {
  const n = Math.max(1, Math.round((Number(sec) || 0) / 60));
  return trf(lang, { vi: '{n} phút', en: '{n} min', ko: '{n}분', ja: '{n}分', zh: '{n}分钟' }, { n });
}

// ---------------- speech units (mirror of server/utils/text.js) ----------------
/** Rate 1.0: vi 165 words/min, en 150 words/min, ko 300 syllables/min, ja 340 chars/min, zh 250 chars/min. */
export const UNITS_PER_MINUTE: Record<LanguageCode, number> = { vi: 165, en: 150, ko: 300, ja: 340, zh: 250 };

const NON_COUNTED = /[\s\p{P}\p{S}]/gu;

/** Words for vi/en; characters excluding spaces & punctuation for ko/ja/zh. */
export function countUnits(text: string | null | undefined, lang: LanguageCode): number {
  if (!text) return 0;
  if (isCjk(lang)) return String(text).replace(NON_COUNTED, '').length;
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

/** Unit name in Vietnamese (admin): "từ" / "âm tiết" / "ký tự". */
export function unitLabelVi(lang: LanguageCode): string {
  return lang === 'ko' ? 'âm tiết' : lang === 'ja' || lang === 'zh' ? 'ký tự' : 'từ';
}

export function estimateDurationSec(text: string | null | undefined, lang: LanguageCode): number {
  const n = countUnits(text, lang);
  if (!n) return 0;
  return Math.max(1, Math.round((n / UNITS_PER_MINUTE[lang]) * 60));
}
