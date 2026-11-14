// Anonymous visitor identity + live presence heartbeat (feeds the admin "live visitors" dashboard).
import type { DeviceType, LanguageCode, VisitorSource } from '../types';
import { api } from './api';
import { isLanguageCode } from '../i18n';

const VISITOR_KEY = 'hl_visitor_id';
const HEARTBEAT_MS = 15000;
const CHANGE_POLL_MS = 1000;
const QR_OVERRIDE_MS = 30 * 60 * 1000;

let memoryId: string | null = null;

function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return (crypto as Crypto).randomUUID();
  } catch {
    /* ignore */
  }
  return 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/** Stable anonymous id stored in localStorage 'hl_visitor_id'. */
export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    if (!memoryId) memoryId = randomId();
    return memoryId;
  }
}

export function getDeviceType(): DeviceType {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile|Windows Phone|Opera Mini|IEMobile/i.test(ua)) return 'mobile';
  // iPadOS reports itself as Mac; detect touch.
  if (/Macintosh/.test(ua) && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1) return 'mobile';
  return 'desktop';
}

export interface HeartbeatState {
  siteId: number | null;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  source: VisitorSource;
  lang?: LanguageCode;
}

// Site set explicitly (e.g. the user scanned a site QR or opened a site page).
let override: { siteId: number | null; source: VisitorSource; at: number } | null = null;
const kickers = new Set<() => void>();

/**
 * Explicitly mark the visitor as being at a site (e.g. after scanning "?site=<id>&src=qr").
 * A QR override stays valid for 30 minutes when GPS does not place the visitor anywhere.
 * Pass null to clear. Triggers an immediate heartbeat on all running loops.
 */
export function setHeartbeatSite(siteId: number | null, source: VisitorSource = 'view'): void {
  override = siteId == null ? null : { siteId, source, at: Date.now() };
  kickers.forEach((k) => k());
}

function currentLang(): LanguageCode {
  try {
    const v = localStorage.getItem('app_lang');
    return isLanguageCode(v) ? v : 'vi';
  } catch {
    return 'vi';
  }
}

function resolveState(getState: () => HeartbeatState): HeartbeatState {
  let s: HeartbeatState;
  try {
    s = getState() || { siteId: null, source: 'view' };
  } catch {
    s = { siteId: null, source: 'view' };
  }
  if (s.siteId == null && override) {
    const fresh = override.source !== 'qr' || Date.now() - override.at <= QR_OVERRIDE_MS;
    if (fresh) return { ...s, siteId: override.siteId, source: override.source };
    override = null;
  }
  return s;
}

/** Signature used to detect meaningful changes (site, source, ~20 m movement). */
function signature(s: HeartbeatState): string {
  const r = (v: number | null | undefined) => (v == null ? '' : Math.round(v * 5000) / 5000);
  return [s.siteId ?? '', s.source, r(s.lat), r(s.lng), s.lang ?? ''].join('|');
}

/**
 * Starts the presence heartbeat: one immediately, then every 15 s, plus an immediate one whenever
 * the state returned by getState() changes. Returns a stop function.
 */
export function startHeartbeat(getState: () => HeartbeatState): () => void {
  let stopped = false;
  let lastSig = '';
  let inFlight = false;
  const device = getDeviceType();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : '';

  const send = async () => {
    if (stopped || inFlight) return;
    const s = resolveState(getState);
    lastSig = signature(s);
    inFlight = true;
    try {
      await api.heartbeat({
        siteId: s.siteId ?? null,
        lat: s.lat ?? null,
        lng: s.lng ?? null,
        accuracy: s.accuracy ?? null,
        source: s.source || 'view',
        lang: s.lang || currentLang(),
        device,
        userAgent
      });
    } catch {
      /* offline: ignore */
    } finally {
      inFlight = false;
    }
  };

  const kick = () => void send();
  kickers.add(kick);
  void send();
  const beat = window.setInterval(kick, HEARTBEAT_MS);
  const poll = window.setInterval(() => {
    if (signature(resolveState(getState)) !== lastSig) kick();
  }, CHANGE_POLL_MS);
  const onVisible = () => {
    if (document.visibilityState === 'visible') kick();
  };
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    stopped = true;
    kickers.delete(kick);
    window.clearInterval(beat);
    window.clearInterval(poll);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
