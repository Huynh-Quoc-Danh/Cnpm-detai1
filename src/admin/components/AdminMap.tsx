// Bản đồ Leaflet cho trang quản trị: bong bóng số khách theo điểm + chấm vị trí từng khách.
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { HALONG_CENTER, cx } from '../utils';

export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export interface MapSite {
  id: number;
  name: string;
  lat: number;
  lng: number;
  radius?: number;
  count?: number;
}

export interface MapDot {
  id: string;
  lat: number;
  lng: number;
  color: string;
  popup?: string;
}

interface AdminMapProps {
  sites: MapSite[];
  dots?: MapDot[];
  className?: string;
  /** Vẽ bong bóng theo số khách (count) */
  bubbles?: boolean;
  showGeofence?: boolean;
  selectedSiteId?: number | null;
  onSiteClick?: (id: number) => void;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export const AdminMap: React.FC<AdminMapProps> = ({ sites, dots = [], className, bubbles = true, showGeofence = true, selectedSiteId, onSiteClick }) => {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const siteLayer = useRef<L.LayerGroup | null>(null);
  const dotLayer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);
  const clickRef = useRef(onSiteClick);
  clickRef.current = onSiteClick;

  useEffect(() => {
    if (!elRef.current) return;
    const map = L.map(elRef.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: false }).setView(HALONG_CENTER, 12);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
    siteLayer.current = L.layerGroup().addTo(map);
    dotLayer.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // bật cuộn chuột sau khi người dùng bấm vào bản đồ
    map.on('click', () => map.scrollWheelZoom.enable());
    map.on('mouseout', () => map.scrollWheelZoom.disable());
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      fitted.current = false;
    };
  }, []);

  // Lớp điểm tham quan
  useEffect(() => {
    const map = mapRef.current;
    const layer = siteLayer.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const max = Math.max(1, ...sites.map((s) => s.count || 0));
    sites.forEach((s) => {
      if (!isFinite(s.lat) || !isFinite(s.lng)) return;
      const selected = selectedSiteId === s.id;
      if (showGeofence && s.radius) {
        L.circle([s.lat, s.lng], {
          radius: s.radius,
          color: selected ? '#0284c7' : '#0ea5e9',
          weight: selected ? 2 : 1,
          dashArray: '4 4',
          fillColor: '#0ea5e9',
          fillOpacity: selected ? 0.12 : 0.05
        }).addTo(layer);
      }
      const count = s.count || 0;
      if (bubbles) {
        const r = 9 + Math.sqrt(count / max) * 20;
        const m = L.circleMarker([s.lat, s.lng], {
          radius: r,
          color: '#ffffff',
          weight: 2,
          fillColor: count > 0 ? '#0284c7' : '#94a3b8',
          fillOpacity: count > 0 ? 0.85 : 0.6
        }).addTo(layer);
        m.bindTooltip(
          `<div style="font-weight:800;font-size:12px">${esc(s.name)}</div><div style="font-size:11px;color:#475569">${count} khách đang có mặt</div>`,
          { direction: 'top', offset: [0, -r] }
        );
        m.on('click', () => clickRef.current?.(s.id));
        L.marker([s.lat, s.lng], {
          interactive: false,
          icon: L.divIcon({
            className: '',
            html: `<div style="transform:translate(-50%,-50%);color:#fff;font:800 12px Inter,sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.35)">${count}</div>`,
            iconSize: [0, 0]
          })
        }).addTo(layer);
      } else {
        const m = L.circleMarker([s.lat, s.lng], { radius: 6, color: '#fff', weight: 2, fillColor: '#0f172a', fillOpacity: 0.9 }).addTo(layer);
        m.bindTooltip(esc(s.name), { direction: 'top', offset: [0, -6] });
        m.on('click', () => clickRef.current?.(s.id));
      }
    });
    if (!fitted.current && sites.length) {
      const b = L.latLngBounds(sites.filter((s) => isFinite(s.lat)).map((s) => [s.lat, s.lng] as [number, number]));
      if (b.isValid()) map.fitBounds(b.pad(0.2), { maxZoom: 14 });
      fitted.current = true;
    }
  }, [sites, bubbles, showGeofence, selectedSiteId]);

  // Lớp khách tham quan
  useEffect(() => {
    const layer = dotLayer.current;
    if (!layer) return;
    layer.clearLayers();
    dots.forEach((d) => {
      if (d.lat === null || d.lng === null || !isFinite(d.lat) || !isFinite(d.lng)) return;
      const m = L.circleMarker([d.lat, d.lng], { radius: 5, color: '#fff', weight: 1.5, fillColor: d.color, fillOpacity: 0.95 }).addTo(layer);
      if (d.popup) m.bindTooltip(d.popup, { direction: 'top', offset: [0, -5] });
    });
  }, [dots]);

  return <div ref={elRef} className={cx('w-full rounded-2xl overflow-hidden bg-slate-100 z-0 isolate', className || 'h-80')} />;
};
