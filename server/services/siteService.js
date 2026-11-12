// BLL: heritage sites, exhibits and narration (preview vs full) logic.
import { siteRepository, exhibitRepository } from '../repositories/siteRepository.js';
import { listenRepository } from '../repositories/visitorRepository.js';
import { settingsService } from './settingsService.js';
import { ticketService } from './ticketService.js';
import { badRequest, notFound } from '../utils/http.js';
import { estimateDurationSec, buildPreviewText, LANGS, normLang } from '../utils/text.js';
export { normLang };
import { transaction } from '../db.js';
import { iso } from '../utils/time.js';

const CATEGORY_KEYS = ['Iconic', 'Unique Rock', 'Island', 'Natural'];
/** Extra languages carried in `translations` (vi/en live in the flat *Vi/*En fields). */
const EXTRA_LANGS = ['ko', 'ja', 'zh'];
/** Fallback chain for a missing language: lang -> en -> vi. */
export const fallbackChain = (l) => [...new Set([l, 'en', 'vi'])];

const str = (v, d = '') => (v == null ? d : String(v));
const num = (v, d = 0) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : d);
const strArr = (v) => (Array.isArray(v) ? v.map((x) => String(x)).filter((x) => x.trim()) : []);

export function slugify(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'site';
}

function normImage(v) {
  const s = str(v).trim();
  if (!s) return '';
  if (/^(https?:|data:|\/)/i.test(s)) return s;
  return '/' + s.replace(/^\.?\//, '');
}

/** { vi, en, ko, ja, zh } strings ('' when missing). */
function langPair(v, fallback = '') {
  const o = v && typeof v === 'object' ? v : {};
  const out = {};
  for (const l of LANGS) out[l] = str(o[l], fallback);
  return out;
}

function urlPair(v) {
  const o = v && typeof v === 'object' ? v : {};
  const f = (x) => (x == null || String(x).trim() === '' ? null : String(x).trim());
  const out = {};
  for (const l of LANGS) out[l] = f(o[l]);
  return out;
}

const emptyText = () => Object.fromEntries(LANGS.map((l) => [l, '']));
const emptyUrl = () => Object.fromEntries(LANGS.map((l) => [l, null]));

const SITE_T_FIELDS = ['name', 'province', 'year', 'category', 'shortDesc', 'history', 'geology'];
const EXHIBIT_T_FIELDS = ['name', 'zone', 'shortDesc'];

/** translations: { ko?: T, ja?: T, zh?: T } – only languages with at least one non-empty field are kept. */
function normTranslations(v, fields, withHighlights) {
  const o = v && typeof v === 'object' ? v : {};
  const out = {};
  for (const l of EXTRA_LANGS) {
    const t = o[l] && typeof o[l] === 'object' ? o[l] : null;
    if (!t) continue;
    const r = {};
    for (const f of fields) r[f] = str(t[f]).trim();
    if (withHighlights) r.highlights = strArr(t.highlights);
    const any = fields.some((f) => r[f]) || (withHighlights && r.highlights.length);
    if (any) out[l] = r;
  }
  return out;
}

/** durationSec per language: keep given positive values, else estimate from the text. */
function durationPair(given, narration, previous) {
  const g = given && typeof given === 'object' ? given : {};
  const out = {};
  for (const l of LANGS) {
    const n = Number(g[l]);
    const textChanged = previous && previous.narration && previous.narration[l] !== narration[l];
    const sameAsPrev = previous && previous.durationSec && Number(previous.durationSec[l]) === n;
    if (Number.isFinite(n) && n > 0 && !(textChanged && sameAsPrev)) out[l] = Math.round(n);
    else out[l] = estimateDurationSec(narration[l], l);
  }
  return out;
}

export function normalizeExhibit(input, siteId, { previous = null, index = 0 } = {}) {
  const src = { ...(previous || {}), ...(input || {}) };
  const narration = langPair(src.narration);
  const ex = {
    id: str(src.id) || `s${siteId}-e${index + 1}`,
    siteId,
    nameVi: str(src.nameVi).trim(),
    nameEn: str(src.nameEn || src.nameVi).trim(),
    zoneVi: str(src.zoneVi).trim(),
    zoneEn: str(src.zoneEn || src.zoneVi).trim(),
    image: normImage(src.image),
    shortDescVi: str(src.shortDescVi).trim(),
    shortDescEn: str(src.shortDescEn).trim(),
    narration,
    durationSec: durationPair(input && 'durationSec' in input ? input.durationSec : src.durationSec, narration, previous),
    audioUrl: urlPair(src.audioUrl),
    translations: normTranslations(src.translations, EXHIBIT_T_FIELDS, false),
    sortOrder: num(src.sortOrder, index + 1)
  };
  const lat = Number(src.lat), lng = Number(src.lng);
  if (src.lat != null && src.lat !== '' && Number.isFinite(lat) && Number.isFinite(lng)) {
    ex.lat = lat;
    ex.lng = lng;
  }
  if (!ex.nameVi) throw badRequest('Tên điểm nhấn (nameVi) không được để trống');
  return ex;
}

/** Validate + fill defaults for a site document (seed files and admin input share this). */
export function normalizeSite(input, { previous = null, id = null } = {}) {
  const src = { ...(previous || {}), ...(input || {}) };
  const siteId = id ?? num(src.id, NaN);
  if (!Number.isInteger(siteId) || siteId <= 0) throw badRequest('id địa điểm không hợp lệ');
  const nameVi = str(src.nameVi).trim();
  if (!nameVi) throw badRequest('Tên địa điểm (nameVi) không được để trống');
  const lat = num(src.lat, NaN), lng = num(src.lng, NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw badRequest('Toạ độ GPS (lat/lng) không hợp lệ');
  }
  const narration = langPair(src.narration);
  const categoryKey = CATEGORY_KEYS.includes(src.categoryKey) ? src.categoryKey : 'Natural';
  const site = {
    id: siteId,
    slug: str(src.slug).trim() || slugify(src.name || nameVi),
    name: str(src.name || nameVi).trim(),
    nameVi,
    provinceEn: str(src.provinceEn, 'Ha Long Bay, Quang Ninh'),
    provinceVi: str(src.provinceVi, 'Vịnh Hạ Long, Quảng Ninh'),
    yearEn: str(src.yearEn),
    yearVi: str(src.yearVi),
    categoryEn: str(src.categoryEn, categoryKey),
    categoryVi: str(src.categoryVi, categoryKey),
    categoryKey,
    image: normImage(src.image),
    fallbackImage: str(src.fallbackImage),
    lat,
    lng,
    rangeMeters: Math.max(20, Math.round(num(src.rangeMeters, 300))),
    rating: Math.min(5, Math.max(0, num(src.rating, 4.8))),
    reviewsCount: Math.max(0, Math.round(num(src.reviewsCount, 0))),
    shortDescVi: str(src.shortDescVi),
    shortDescEn: str(src.shortDescEn),
    historyVi: str(src.historyVi),
    historyEn: str(src.historyEn),
    geologyVi: str(src.geologyVi),
    geologyEn: str(src.geologyEn),
    highlightsVi: strArr(src.highlightsVi),
    highlightsEn: strArr(src.highlightsEn),
    narration,
    durationSec: durationPair(input && 'durationSec' in input ? input.durationSec : src.durationSec, narration, previous),
    audioUrl: urlPair(src.audioUrl),
    translations: normTranslations(src.translations, SITE_T_FIELDS, true),
    coordSource: src.coordSource ? str(src.coordSource) : undefined,
    isActive: src.isActive === undefined ? true : !!src.isActive
  };
  if (site.coordSource === undefined) delete site.coordSource;
  return site;
}

function stripExhibit(ex) {
  // Không bao giờ lộ bản thuyết minh / file âm thanh đầy đủ cho khách chưa trả tiền.
  return { ...ex, narration: emptyText(), audioUrl: emptyUrl() };
}

function stripSite(site) {
  return { ...site, narration: emptyText(), audioUrl: emptyUrl(), exhibits: (site.exhibits || []).map(stripExhibit) };
}

async function withExhibits(site) {
  if (!site) return null;
  return { ...site, exhibits: await exhibitRepository.findBySite(site.id) };
}

async function withExhibitsAll(sites) {
  const out = [];
  for (const s of sites) out.push(await withExhibits(s));
  return out;
}

export const siteService = {
  // ---------- public ----------
  async listPublic() {
    return (await withExhibitsAll(await siteRepository.findAll())).map(stripSite);
  },
  async getPublic(id) {
    const site = await siteRepository.findById(Number(id));
    if (!site || !site.isActive) throw notFound('Không tìm thấy địa điểm');
    return stripSite(await withExhibits(site));
  },
  async count() {
    return siteRepository.count();
  },

  /**
   * Narration for a site (or one exhibit). Full text only for entitled tickets, otherwise
   * the leading sentences totalling ~previewSeconds. Always logs a listen row.
   */
  async getNarration(siteId, { lang = 'vi', exhibitId = null, token = null, visitorId = null } = {}) {
    const l = normLang(lang);
    const site = await siteRepository.findById(Number(siteId));
    if (!site || !site.isActive) throw notFound('Không tìm thấy địa điểm');
    let target = site;
    if (exhibitId) {
      const ex = await exhibitRepository.findById(String(exhibitId));
      if (!ex || ex.siteId !== site.id) throw notFound('Không tìm thấy điểm nhấn');
      target = ex;
    }
    const { previewSeconds } = await settingsService.get();
    // Fallback lang -> en -> vi: text, duration and audio all come from the same language.
    const narr = target.narration || {};
    const textLang = fallbackChain(l).find((x) => narr[x] && String(narr[x]).trim()) || l;
    const fullText = narr[textLang] || '';
    const durationSec = (target.durationSec && Number(target.durationSec[textLang])) || estimateDurationSec(fullText, textLang);
    const entitled = await ticketService.hasAccess(token, site.id);
    const locked = !entitled && durationSec > previewSeconds;
    const text = locked ? buildPreviewText(fullText, durationSec, previewSeconds, textLang) : fullText;
    // File mp3 đầy đủ chỉ trao cho vé hợp lệ; khách nghe thử dùng giọng đọc TTS của đoạn thử.
    const audioUrl = locked ? null : (target.audioUrl && target.audioUrl[textLang]) || null;
    const exKey = exhibitId ? String(exhibitId) : null;
    const nowMs = Date.now();
    // Tải lại (mua vé, đổi ngôn ngữ, thử lại) trong 5 phút không tính là lượt nghe mới
    const dup = await listenRepository.existsRecent(visitorId, site.id, exKey, nowMs - 5 * 60_000);
    if (!dup) await listenRepository.insert({
      siteId: site.id,
      exhibitId: exhibitId ? String(exhibitId) : null,
      lang: l,
      visitorId,
      locked,
      createdAt: iso(),
      createdMs: nowMs
    });
    // `lang` = language of `text` (differs from the requested one when it fell back) – use it for TTS.
    return { locked, text, durationSec, previewSec: previewSeconds, audioUrl, lang: textLang, requestedLang: l };
  },

  // ---------- admin ----------
  async listAdmin() {
    return withExhibitsAll(await siteRepository.findAll({ includeInactive: true }));
  },
  async getAdmin(id) {
    const site = await siteRepository.findById(Number(id));
    if (!site) throw notFound('Không tìm thấy địa điểm');
    return withExhibits(site);
  },
  async create(input) {
    return transaction(async () => {
      const id = input && input.id != null && input.id !== '' ? Number(input.id) : await siteRepository.nextId();
      if (await siteRepository.exists(id)) throw badRequest(`Địa điểm id=${id} đã tồn tại`);
      const site = normalizeSite(input, { id });
      await siteRepository.upsert(site);
      const list = Array.isArray(input.exhibits) ? input.exhibits : [];
      for (let i = 0; i < list.length; i++) {
        const e = normalizeExhibit({ ...list[i], id: undefined }, id, { index: i });
        e.id = await exhibitRepository.nextIdForSite(id);
        await exhibitRepository.upsert(e);
      }
      return this.getAdmin(id);
    });
  },
  async update(id, input) {
    return transaction(async () => {
      const prev = await siteRepository.findById(Number(id));
      if (!prev) throw notFound('Không tìm thấy địa điểm');
      const site = normalizeSite({ ...input, id: prev.id }, { previous: prev, id: prev.id });
      await siteRepository.upsert(site);
      if (Array.isArray(input.exhibits)) {
        // Full replacement of the exhibit list when provided.
        const keep = new Set();
        for (let i = 0; i < input.exhibits.length; i++) {
          const ex = input.exhibits[i];
          const existing = ex.id ? await exhibitRepository.findById(String(ex.id)) : null;
          const prevEx = existing && existing.siteId === prev.id ? existing : null;
          const e = normalizeExhibit({ ...ex, id: prevEx ? prevEx.id : undefined }, prev.id, { previous: prevEx, index: i });
          if (!prevEx) e.id = await exhibitRepository.nextIdForSite(prev.id);
          await exhibitRepository.upsert(e);
          keep.add(e.id);
        }
        for (const ex of await exhibitRepository.findBySite(prev.id)) {
          if (!keep.has(ex.id)) await exhibitRepository.delete(ex.id);
        }
      }
      return this.getAdmin(prev.id);
    });
  },
  async remove(id) {
    if (!(await siteRepository.delete(Number(id)))) throw notFound('Không tìm thấy địa điểm');
    return { ok: true };
  },
  async createExhibit(siteId, input) {
    const site = await siteRepository.findById(Number(siteId));
    if (!site) throw notFound('Không tìm thấy địa điểm');
    const maxSort = await exhibitRepository.maxSortOrder(site.id);
    const e = normalizeExhibit({ ...input, id: undefined }, site.id, { index: maxSort });
    if (input.sortOrder == null) e.sortOrder = maxSort + 1;
    e.id = await exhibitRepository.nextIdForSite(site.id);
    return exhibitRepository.upsert(e);
  },
  async updateExhibit(exhibitId, input) {
    const prev = await exhibitRepository.findById(String(exhibitId));
    if (!prev) throw notFound('Không tìm thấy điểm nhấn');
    const e = normalizeExhibit({ ...input, id: prev.id }, prev.siteId, { previous: prev });
    return exhibitRepository.upsert(e);
  },
  async removeExhibit(exhibitId) {
    if (!(await exhibitRepository.delete(String(exhibitId)))) throw notFound('Không tìm thấy điểm nhấn');
    return { ok: true };
  },

  /** Insert from a seed document (site + exhibits) — used by seed.js. */
  async importSeed(doc) {
    return transaction(async () => {
      const site = normalizeSite(doc);
      await siteRepository.upsert(site);
      await exhibitRepository.deleteBySite(site.id);
      const used = new Set();
      const list = Array.isArray(doc.exhibits) ? doc.exhibits : [];
      for (let i = 0; i < list.length; i++) {
        try {
          const e = normalizeExhibit(list[i], site.id, { index: i });
          if (!/^s\d+-e\d+$/.test(e.id) || used.has(e.id)) e.id = `s${site.id}-e${i + 1}`;
          while (used.has(e.id)) e.id = `${e.id}x`;
          used.add(e.id);
          await exhibitRepository.upsert(e);
        } catch (err) {
          console.warn(`[seed] site ${site.id}: bỏ qua điểm nhấn #${i + 1}: ${err.message}`);
        }
      }
      return site;
    });
  }
};
