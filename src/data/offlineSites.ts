// Offline fallback data (used only when the API is unreachable).
// Primary source: the seed documents (server/seed/sites/*.json) injected at build time by the
// `virtual:offline-sites` Vite plugin with full narrations stripped. Any site missing there is
// mapped from the legacy mock entries in mockData.ts.
import { sites as seedSites, previews as seedPreviews } from 'virtual:offline-sites';
import { heritageSites as legacySites } from './mockData';
import type { HeritageSite, LegacyHeritageSite, LanguageCode } from '../types';
import { fallbackChain } from '../i18n';

const VI_WPM = 165;
const EN_WPM = 150;

function estimate(text: string, wpm: number): number {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
  return words ? Math.max(1, Math.round((words / wpm) * 60)) : 0;
}

function slugify(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const withSlash = (p: string) => (!p || /^(https?:|data:|\/)/i.test(p) ? p : '/' + p.replace(/^\.?\//, ''));

/** Map an old mock entry (audioText/durationVi...) to the contract HeritageSite schema. */
export function legacyToHeritageSite(s: LegacyHeritageSite): HeritageSite {
  return {
    id: s.id,
    slug: slugify(s.name),
    name: s.name,
    nameVi: s.nameVi,
    provinceEn: s.provinceEn,
    provinceVi: s.provinceVi,
    yearEn: s.yearEn,
    yearVi: s.yearVi,
    categoryEn: s.categoryEn,
    categoryVi: s.categoryVi,
    categoryKey: s.categoryKey,
    image: withSlash(s.image),
    fallbackImage: s.fallbackImage,
    lat: s.lat,
    lng: s.lng,
    rangeMeters: s.rangeMeters,
    rating: s.rating,
    reviewsCount: s.reviewsCount,
    shortDescVi: s.shortDescVi,
    shortDescEn: s.shortDescEn,
    historyVi: s.historyVi,
    historyEn: s.historyEn,
    geologyVi: s.geologyVi,
    geologyEn: s.geologyEn,
    highlightsVi: s.highlightsVi,
    highlightsEn: s.highlightsEn,
    narration: { vi: '', en: '' },
    durationSec: { vi: estimate(s.audioText.vi, VI_WPM), en: estimate(s.audioText.en, EN_WPM) },
    audioUrl: { vi: null, en: null },
    isActive: true,
    exhibits: []
  };
}

const legacyById = new Map(legacySites.map((s) => [s.id, s]));

function buildOfflineSites(): HeritageSite[] {
  const byId = new Map<number, HeritageSite>();
  for (const s of seedSites || []) {
    if (s && Number.isInteger(s.id) && s.isActive !== false) byId.set(s.id, { ...s, exhibits: s.exhibits || [] });
  }
  for (const s of legacySites) if (!byId.has(s.id)) byId.set(s.id, legacyToHeritageSite(s));
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

/** Sites for offline mode (narration stripped). */
export const offlineSites: HeritageSite[] = buildOfflineSites();

/**
 * Offline preview text (~30 s) for a site or an exhibit. Falls back to the legacy short
 * audio text of the mock data.
 */
export function getOfflinePreview(siteId: number, lang: LanguageCode, exhibitId?: string): string {
  const key = exhibitId || String(siteId);
  const p = (seedPreviews ? seedPreviews[key] : undefined) as Partial<Record<LanguageCode, string>> | undefined;
  // ko/ja/zh chưa có bản dịch -> en -> vi (giống server)
  const hit = p ? fallbackChain(lang).find((l) => (p[l] || '').trim()) : undefined;
  if (hit) return p![hit]!;
  if (exhibitId) return '';
  const legacy = legacyById.get(siteId);
  if (!legacy) return '';
  return lang === 'vi' ? legacy.audioText.vi : legacy.audioText.en || legacy.audioText.vi;
}
