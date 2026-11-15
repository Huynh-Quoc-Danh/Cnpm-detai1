// Chọn toạ độ GPS: bấm vào bản đồ hoặc kéo ghim; vòng tròn xem trước bán kính geofence.
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { HALONG_CENTER, cx } from '../utils';
import { TILE_ATTR, TILE_URL } from './AdminMap';

interface MapPickerProps {
  lat: number | '' | null;
  lng: number | '' | null;
  radius: number | '' | null;
  onChange: (lat: number, lng: number) => void;
  /** Các điểm khác để tham chiếu (màu xám) */
  others?: Array<{ id: number | string; name: string; lat: number; lng: number }>;
  className?: string;
}

const pinIcon = L.divIcon({
  className: '',
  html:
    '<div style="transform:translate(-50%,-100%);filter:drop-shadow(0 4px 6px rgba(2,132,199,.35))">' +
    '<svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 0C7.6 0 0 7.5 0 16.8 0 29.4 17 44 17 44s17-14.6 17-27.2C34 7.5 26.4 0 17 0z" fill="#0284c7"/>' +
    '<circle cx="17" cy="16.5" r="6.5" fill="#fff"/></svg></div>',
  iconSize: [0, 0]
});

const valid = (v: unknown): v is number => typeof v === 'number' && isFinite(v);

export const MapPicker: React.FC<MapPickerProps> = ({ lat, lng, radius, onChange, others = [], className }) => {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const othersRef = useRef<L.LayerGroup | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!elRef.current) return;
    const start: [number, number] = valid(lat) && valid(lng) ? [lat, lng] : HALONG_CENTER;
    const map = L.map(elRef.current, { zoomControl: true }).setView(start, valid(lat) ? 14 : 11);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
    othersRef.current = L.layerGroup().addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => cb.current(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)));
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!valid(lat) || !valid(lng)) {
      markerRef.current?.remove();
      circleRef.current?.remove();
      markerRef.current = null;
      circleRef.current = null;
      return;
    }
    const pos: [number, number] = [lat, lng];
    if (!markerRef.current) {
      const m = L.marker(pos, { draggable: true, icon: pinIcon, autoPan: true }).addTo(map);
      m.on('dragend', () => {
        const p = m.getLatLng();
        cb.current(+p.lat.toFixed(6), +p.lng.toFixed(6));
      });
      markerRef.current = m;
    } else markerRef.current.setLatLng(pos);
    const r = valid(radius) && radius > 0 ? radius : 0;
    if (!circleRef.current) {
      circleRef.current = L.circle(pos, { radius: r, color: '#0284c7', weight: 2, fillColor: '#0ea5e9', fillOpacity: 0.12, interactive: false }).addTo(map);
    } else {
      circleRef.current.setLatLng(pos);
      circleRef.current.setRadius(r);
    }
    if (!map.getBounds().contains(pos)) map.panTo(pos);
  }, [lat, lng, radius]);

  useEffect(() => {
    const layer = othersRef.current;
    if (!layer) return;
    layer.clearLayers();
    others.forEach((o) => {
      if (!valid(o.lat) || !valid(o.lng)) return;
      L.circleMarker([o.lat, o.lng], { radius: 5, color: '#fff', weight: 1.5, fillColor: '#64748b', fillOpacity: 0.8 })
        .bindTooltip(o.name, { direction: 'top' })
        .addTo(layer);
    });
  }, [others]);

  const focus = () => {
    const map = mapRef.current;
    if (map && valid(lat) && valid(lng)) map.setView([lat, lng], 15);
  };

  return (
    <div className="relative">
      <div ref={elRef} className={cx('w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 z-0 isolate cursor-crosshair', className || 'h-80')} />
      <div className="absolute left-3 bottom-3 z-[500] flex gap-2 pointer-events-none">
        <span className="pointer-events-auto text-[11px] font-semibold bg-white/95 backdrop-blur px-2.5 py-1 rounded-full shadow border border-slate-200 text-slate-600">
          <i className="fa-solid fa-hand-pointer mr-1 text-sky-600"></i>Bấm lên bản đồ hoặc kéo ghim để đặt vị trí
        </span>
      </div>
      {valid(lat) && (
        <button
          type="button"
          onClick={focus}
          className="absolute right-3 top-3 z-[500] w-9 h-9 rounded-xl bg-white shadow border border-slate-200 text-slate-600 hover:text-sky-600"
          title="Về vị trí đã chọn"
          aria-label="Về vị trí đã chọn"
        >
          <i className="fa-solid fa-location-crosshairs"></i>
        </button>
      )}
    </div>
  );
};
