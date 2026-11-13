// BLL: live visitor presence (heartbeats, geofencing) and the visitor simulator for demos.
import { visitorRepository } from '../repositories/visitorRepository.js';
import { siteRepository } from '../repositories/siteRepository.js';
import { settingsService } from './settingsService.js';
import { badRequest } from '../utils/http.js';
import { iso } from '../utils/time.js';
import { normLang } from '../utils/text.js';

export const LIVE_WINDOW_MS = 60 * 1000;
const QR_STICKY_MS = 30 * 60 * 1000;
const SOURCES = ['gps', 'qr', 'view', 'sim'];

export function haversineMeters(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Site whose geofence contains the point (nearest if several), else null. */
function geofenceSite(sites, lat, lng) {
  let best = null;
  for (const s of sites) {
    const d = haversineMeters(lat, lng, s.lat, s.lng);
    if (d <= s.rangeMeters && (!best || d < best.d)) best = { site: s, d };
  }
  return best ? best.site : null;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
/** Simulated visitor language mix (Ha Long: mostly domestic, then Korean, Chinese, Western, Japanese). */
function simLang() {
  const r = Math.random();
  return r < 0.55 ? 'vi' : r < 0.7 ? 'ko' : r < 0.82 ? 'zh' : r < 0.94 ? 'en' : 'ja';
}

/** Random point within ~80% of a site's geofence radius. */
function jitter(site) {
  const r = site.rangeMeters * 0.8 * Math.sqrt(Math.random());
  const t = Math.random() * 2 * Math.PI;
  const dLat = (r * Math.cos(t)) / 111320;
  const dLng = (r * Math.sin(t)) / (111320 * Math.cos((site.lat * Math.PI) / 180));
  return { lat: +(site.lat + dLat).toFixed(6), lng: +(site.lng + dLng).toFixed(6) };
}

let simTimer = null;
let simTarget = 0;
let simBusy = false; // a tick is still running (DB calls are async) -> skip overlapping ticks

export const visitorService = {
  async heartbeat(body = {}, userAgent = '') {
    const visitorId = String(body.visitorId || '').trim().slice(0, 64);
    if (!visitorId) throw badRequest('visitorId là bắt buộc');
    if (visitorId.startsWith('sim-')) throw badRequest('visitorId không hợp lệ');
    const now = Date.now();
    const prev = await visitorRepository.findById(visitorId);
    const sites = await siteRepository.findAll();
    const siteIds = new Set(sites.map((s) => s.id));
    // A real device may run the map's demo simulation (cruise / click-to-place). Those positions are
    // stored as simulated ('sim', isSim) so the admin labels them "mô phỏng" instead of counting them as real.
    const clientSim = body.source === 'sim' || body.simulated === true;
    const source = clientSim ? 'sim' : SOURCES.includes(body.source) ? body.source : 'view';
    const lat = Number(body.lat), lng = Number(body.lng);
    const hasPos = body.lat != null && body.lng != null && Number.isFinite(lat) && Number.isFinite(lng);
    let siteId = body.siteId == null || body.siteId === '' ? null : Number(body.siteId);
    if (siteId != null && !siteIds.has(siteId)) siteId = null;

    let qrSiteId = prev ? prev.qrSiteId : null;
    let qrMs = prev ? prev.qrMs : null;
    if (source === 'qr' && siteId != null) {
      qrSiteId = siteId;
      qrMs = now;
    }
    // Server-side geofence as a backup when the client sends a position without a site.
    if (siteId == null && hasPos && !clientSim) {
      const s = geofenceSite(sites, lat, lng);
      if (s) siteId = s.id;
    }
    // A scanned site QR keeps the visitor "at" that site for 30 minutes.
    if (siteId == null && !clientSim && qrSiteId != null && qrMs && now - qrMs <= QR_STICKY_MS && siteIds.has(qrSiteId)) {
      siteId = qrSiteId;
    }
    const device = body.device === 'mobile' ? 'mobile' : 'desktop';
    await visitorRepository.upsert({
      visitorId,
      siteId,
      lat: hasPos ? lat : prev ? prev.lat : null,
      lng: hasPos ? lng : prev ? prev.lng : null,
      accuracy: Number.isFinite(Number(body.accuracy)) && body.accuracy != null ? Number(body.accuracy) : prev ? prev.accuracy : null,
      source,
      lang: normLang(body.lang),
      device,
      userAgent: String(body.userAgent || userAgent || '').slice(0, 300),
      qrSiteId,
      qrMs,
      isSim: clientSim,
      firstSeen: prev ? prev.firstSeen : iso(now),
      lastSeen: iso(now),
      lastSeenMs: now
    });
    const out = { ok: true, siteId };
    if (siteId != null) out.activeAtSite = await visitorRepository.countLiveAtSite(siteId, now - LIVE_WINDOW_MS);
    return out;
  },

  async live() {
    const now = Date.now();
    const sites = await siteRepository.findAll();
    const names = new Map(sites.map((s) => [s.id, s.nameVi]));
    const visitors = (await visitorRepository.findLive(now - LIVE_WINDOW_MS)).map((v) => ({
      visitorId: v.visitorId,
      siteId: v.siteId,
      siteName: v.siteId != null ? names.get(v.siteId) || null : null,
      lat: v.lat,
      lng: v.lng,
      source: v.source,
      device: v.device,
      lang: v.lang,
      lastSeen: v.lastSeen,
      firstSeen: v.firstSeen,
      simulated: v.isSim
    }));
    const perSite = sites.map((s) => {
      const here = visitors.filter((v) => v.siteId === s.id);
      return {
        siteId: s.id,
        nameVi: s.nameVi,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        count: here.length,
        real: here.filter((v) => !v.simulated).length,
        simulated: here.filter((v) => v.simulated).length
      };
    });
    const simulated = visitors.filter((v) => v.simulated).length;
    return {
      visitors,
      perSite,
      liveTotal: visitors.length,
      liveReal: visitors.length - simulated,
      liveSimulated: simulated,
      windowSec: LIVE_WINDOW_MS / 1000,
      simulateVisitors: (await settingsService.get()).simulateVisitors
    };
  },

  // ---------- simulator ----------
  async _simTick() {
    const sites = await siteRepository.findAll();
    if (!sites.length) return;
    const now = Date.now();
    const current = await visitorRepository.findSimulated();
    if (!simTarget) simTarget = Math.round(rnd(10, 20));
    // Random walk of the target crowd size, 8..25.
    simTarget = Math.min(25, Math.max(8, simTarget + Math.round(rnd(-2, 2))));
    // Remove extras.
    const shuffled = current.sort(() => Math.random() - 0.5);
    const keep = shuffled.slice(0, simTarget);
    for (const v of shuffled.slice(simTarget)) await visitorRepository.delete(v.visitorId);
    // Weighted site popularity (bigger geofence / more reviews -> more people).
    const weights = sites.map((s) => 1 + Math.log10(1 + (s.reviewsCount || 0)));
    const totalW = weights.reduce((a, b) => a + b, 0);
    const weightedSite = () => {
      let r = Math.random() * totalW;
      for (let i = 0; i < sites.length; i++) if ((r -= weights[i]) <= 0) return sites[i];
      return sites[sites.length - 1];
    };
    const save = (v, site, isNew) => {
      const pos = site ? jitter(site) : { lat: v.lat, lng: v.lng };
      return visitorRepository.upsert({
        visitorId: v.visitorId,
        siteId: site ? site.id : null,
        lat: pos.lat,
        lng: pos.lng,
        accuracy: Math.round(rnd(5, 30)),
        source: 'sim',
        lang: v.lang || simLang(),
        device: v.device || (Math.random() < 0.8 ? 'mobile' : 'desktop'),
        userAgent: 'SmartGuide-Simulator',
        qrSiteId: null,
        qrMs: null,
        isSim: true,
        firstSeen: isNew ? iso(now) : v.firstSeen,
        lastSeen: iso(now),
        lastSeenMs: now
      });
    };
    for (const v of keep) {
      const stillSite = sites.find((s) => s.id === v.siteId);
      const move = !stillSite || Math.random() < 0.08;
      await save(v, move ? weightedSite() : stillSite, false);
    }
    for (let i = keep.length; i < simTarget; i++) {
      const id = 'sim-' + Math.random().toString(36).slice(2, 10);
      await save({ visitorId: id }, weightedSite(), true);
    }
  },
  startSimulator() {
    if (simTimer) return;
    const tick = async () => {
      if (simBusy) return;
      simBusy = true;
      try {
        if ((await settingsService.get()).simulateVisitors) await this._simTick();
        else await visitorRepository.deleteSimulated();
        await visitorRepository.purgeOlderThan(Date.now() - 7 * 24 * 3600 * 1000);
      } catch (e) {
        console.error('[sim] tick error', e.message);
      } finally {
        simBusy = false;
      }
    };
    tick();
    simTimer = setInterval(tick, 10000);
    simTimer.unref?.();
    settingsService.onChange((next) => {
      if (!next.simulateVisitors) {
        visitorRepository.deleteSimulated().catch((e) => console.error('[sim] cleanup error', e.message));
      } else tick();
    });
  },
  stopSimulator() {
    if (simTimer) clearInterval(simTimer);
    simTimer = null;
  }
};
