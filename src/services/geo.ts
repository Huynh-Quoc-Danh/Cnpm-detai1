// Geo helpers: great-circle distance, geofence lookup, distance formatting.
import type { HeritageSite, LanguageCode } from '../types';
import { numberLocale } from '../i18n';

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;

/** Haversine distance in metres. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface NearestSiteResult {
  site: HeritageSite;
  /** metres */
  distance: number;
  /** true when inside the site's geofence (distance <= rangeMeters) */
  inside: boolean;
}

/**
 * Nearest site to a position. If the point is inside one or more geofences, the closest of those
 * is returned (inside = true). Returns null when the list is empty.
 */
export function findNearestSite(sites: HeritageSite[], lat: number, lng: number): NearestSiteResult | null {
  let nearest: NearestSiteResult | null = null;
  for (const site of sites || []) {
    if (!Number.isFinite(site.lat) || !Number.isFinite(site.lng)) continue;
    const distance = haversineMeters({ lat, lng }, { lat: site.lat, lng: site.lng });
    const inside = distance <= (site.rangeMeters || 0);
    if (
      !nearest ||
      (inside && !nearest.inside) ||
      (inside === nearest.inside && distance < nearest.distance)
    ) {
      nearest = { site, distance, inside };
    }
  }
  return nearest;
}

/** 850 -> "850 m", 1234 -> "1,2 km" (vi) / "1.2 km" (en, ko, ja, zh). */
export function formatDistance(m: number, lang: LanguageCode = 'vi'): string {
  if (!Number.isFinite(m)) return '—';
  if (m < 1000) return `${Math.round(m)} m`;
  const km = m / 1000;
  const digits = km < 10 ? 1 : 0;
  return `${km.toLocaleString(numberLocale(lang), { maximumFractionDigits: digits, minimumFractionDigits: digits })} km`;
}
