// Bản đồ Leaflet: lớp nền, ghim địa điểm có nhãn, vùng geofence, tuyến tham quan, vị trí GPS & thuyền mô phỏng.
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import L from 'leaflet';
import type { HeritageSite, LanguageCode } from '../../types';
import { formatDistance } from '../../services/geo';
import { boatIcon, escapeHtml, routeStepIcon, siteIcon, userIcon } from './markers';
import { siteName, siteText } from '../../i18n';

export interface MapPoint {
  lat: number;
  lng: number;
  accuracy?: number | null;
  heading?: number | null;
}

export interface MapViewHandle {
  flyToSite: (site: HeritageSite, zoom?: number) => void;
  flyTo: (p: { lat: number; lng: number }, zoom?: number) => void;
  fitAll: () => void;
  fitRoute: () => void;
  openPopup: (siteId: number) => void;
}

interface MapViewProps {
  sites: HeritageSite[];
  lang: LanguageCode;
  selectedId: number | null;
  insideSiteId: number | null;
  userPos: MapPoint | null;
  simPos: MapPoint | null;
  simKind: 'boat' | 'pin';
  routeSites: HeritageSite[] | null;
  follow: boolean;
  clickToPlace: boolean;
  onMapClick: (p: { lat: number; lng: number }) => void;
  onSelect: (site: HeritageSite) => void;
  onPlay: (site: HeritageSite) => void;
  onDetail: (site: HeritageSite) => void;
  onQr: (site: HeritageSite) => void;
  onUserInteract?: () => void;
  getDistance: (site: HeritageSite) => number | null;
  className?: string;
}

const BASE_LAYER_KEY = 'hl_map_base';

type MapText = Record<
  | 'map' | 'sat' | 'carto' | 'play' | 'outside' | 'approx' | 'approxHint' | 'showAll'
  | 'detail' | 'qr' | 'away' | 'radius' | 'you' | 'sim' | 'acc',
  string
>;

const T: Record<LanguageCode, MapText> = {
  vi: {
    map: 'Bản đồ',
    sat: 'Vệ tinh',
    carto: 'Bản đồ sáng',
    play: 'Nghe thuyết minh',
    outside: '+{n} điểm ngoài khung',
    approx: 'Vị trí ước tính',
    approxHint: 'Chưa có nguồn công bố toạ độ chính xác – vùng nhận diện được nới rộng',
    showAll: 'Xem toàn bộ',
    detail: 'Chi tiết',
    qr: 'Mã QR',
    away: '{d} từ vị trí của bạn',
    radius: 'Bán kính',
    you: 'Bạn đang ở đây',
    sim: 'Vị trí mô phỏng',
    acc: 'Độ chính xác'
  },
  en: {
    map: 'Map',
    sat: 'Satellite',
    carto: 'Light map',
    play: 'Play narration',
    outside: '+{n} more outside view',
    approx: 'Approximate location',
    approxHint: 'No published exact coordinates – detection radius widened',
    showAll: 'Show all',
    detail: 'Details',
    qr: 'QR code',
    away: '{d} from you',
    radius: 'Radius',
    you: 'You are here',
    sim: 'Simulated position',
    acc: 'Accuracy'
  },
  ko: {
    map: '지도',
    sat: '위성',
    carto: '밝은 지도',
    play: '해설 듣기',
    outside: '화면 밖 +{n}곳',
    approx: '추정 위치',
    approxHint: '정확한 좌표가 공개되지 않아 인식 반경을 넓혔어요',
    showAll: '전체 보기',
    detail: '자세히',
    qr: 'QR 코드',
    away: '현재 위치에서 {d}',
    radius: '반경',
    you: '현재 위치',
    sim: '가상 위치',
    acc: '정확도'
  },
  ja: {
    map: '地図',
    sat: '衛星写真',
    carto: 'ライトマップ',
    play: '解説を聞く',
    outside: '表示範囲外 +{n}か所',
    approx: '推定位置',
    approxHint: '正確な座標が公開されていないため、検知範囲を広げています',
    showAll: 'すべて表示',
    detail: '詳細',
    qr: 'QRコード',
    away: '現在地から{d}',
    radius: '半径',
    you: '現在地',
    sim: '仮想位置',
    acc: '精度'
  },
  zh: {
    map: '地图',
    sat: '卫星',
    carto: '浅色地图',
    play: '收听讲解',
    outside: '视野外 +{n} 个景点',
    approx: '估计位置',
    approxHint: '暂无公开的精确坐标 – 已扩大识别范围',
    showAll: '显示全部',
    detail: '详情',
    qr: '二维码',
    away: '距您 {d}',
    radius: '半径',
    you: '您在这里',
    sim: '模拟位置',
    acc: '精度'
  }
};

function circleStyle(selected: boolean, inside: boolean): L.PathOptions {
  if (inside) {
    return { color: '#10b981', weight: 2, opacity: 0.9, fillColor: '#34d399', fillOpacity: 0.22, dashArray: undefined };
  }
  if (selected) {
    return { color: '#0d9488', weight: 2, opacity: 0.9, fillColor: '#2dd4bf', fillOpacity: 0.16, dashArray: '6 6' };
  }
  return { color: '#0284c7', weight: 1, opacity: 0.35, fillColor: '#38bdf8', fillOpacity: 0.05, dashArray: undefined };
}

export const MapView = forwardRef<MapViewHandle, MapViewProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const siteLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<number, { marker: L.Marker; circle: L.Circle; site: HeritageSite }>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);
  const simMarkerRef = useRef<L.Marker | null>(null);
  const layersCtlRef = useRef<L.Control.Layers | null>(null);
  const baseLayersRef = useRef<Record<'osm' | 'sat' | 'carto', L.TileLayer> | null>(null);
  const [outside, setOutside] = useState<HeritageSite[]>([]);
  const fittedRef = useRef(false);
  const lastFollowRef = useRef(0);
  const lastHeadingRef = useRef<number>(-999);

  // Luôn dùng props mới nhất trong các handler Leaflet
  const propsRef = useRef(props);
  propsRef.current = props;

  const t = T[props.lang] || T.vi;

  function followTo(ll: L.LatLngTuple) {
    const map = mapRef.current;
    if (!map) return;
    const now = Date.now();
    if (now - lastFollowRef.current < 400) return;
    lastFollowRef.current = now;
    const inner = map.getBounds().pad(-0.25);
    if (!inner.contains(ll)) map.panTo(ll, { animate: true, duration: 0.4 });
  }

  /**
   * Căn khung. coreOnly: bỏ các điểm cách trung vị > 15 km (vd. Hòn Thiên Nga ở Bái Tử Long, ~30 km về
   * phía đông) để 6 điểm vịnh Hạ Long không bị dồn vào vài chục pixel lúc mở bản đồ.
   */
  function fitAllInternal(animate = true, coreOnly = false): boolean {
    const map = mapRef.current;
    if (!map) return false;
    const valid = propsRef.current.sites.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
    if (!valid.length) return false;
    map.invalidateSize();
    const size = map.getSize();
    if (size.x <= 0 || size.y <= 0) return false; // chưa đo được kích thước -> để ResizeObserver căn sau
    let use = valid;
    if (coreOnly && valid.length > 2) {
      const med = (arr: number[]) => {
        const a = [...arr].sort((x, y) => x - y);
        const m = Math.floor(a.length / 2);
        return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
      };
      const c = L.latLng(med(valid.map((s) => s.lat)), med(valid.map((s) => s.lng)));
      const core = valid.filter((s) => c.distanceTo([s.lat, s.lng]) <= 15000);
      if (core.length >= 2) use = core;
    }
    const pts = use.map((s) => [s.lat, s.lng] as L.LatLngTuple);
    // chừa cột nút nổi bên trái
    map.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [72, 56], paddingBottomRight: [48, 64], maxZoom: 14, animate });
    return true;
  }

  /** Ẩn nhãn tên bị chồng lên nhau (ưu tiên điểm đang chọn / đang ở trong vùng). */
  function declutterLabels() {
    const map = mapRef.current;
    const box = containerRef.current;
    if (!map || !box) return;
    const items: { el: HTMLElement; head: DOMRect; label: DOMRect; prio: number }[] = [];
    markersRef.current.forEach(({ marker, site }) => {
      const root = marker.getElement();
      if (!root) return;
      const label = root.querySelector('.hl-pin-label') as HTMLElement | null;
      const head = root.querySelector('.hl-pin-head') as HTMLElement | null;
      if (!label || !head) return;
      label.classList.remove('is-hidden');
      const p = propsRef.current;
      const prio = site.id === p.insideSiteId ? 3 : site.id === p.selectedId ? 2 : 0;
      items.push({ el: label, head: head.getBoundingClientRect(), label: label.getBoundingClientRect(), prio });
    });
    const outer = box.getBoundingClientRect();
    const hit = (a: DOMRect, b: DOMRect, pad = 2) =>
      a.left < b.right + pad && a.right + pad > b.left && a.top < b.bottom + pad && a.bottom + pad > b.top;
    items.sort((a, b) => b.prio - a.prio);
    const shown: DOMRect[] = [];
    for (const it of items) {
      const r = it.label;
      const offEdge = r.left < outer.left - 1 || r.right > outer.right + 1;
      const overHead = items.some((o) => o !== it && hit(r, o.head, 0));
      const clash = shown.some((s) => hit(r, s));
      if (it.prio < 2 && (clash || overHead || offEdge)) it.el.classList.add('is-hidden');
      else shown.push(r);
    }
  }

  function updateOutside() {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    const out = propsRef.current.sites.filter(
      (s) => Number.isFinite(s.lat) && Number.isFinite(s.lng) && !b.contains([s.lat, s.lng])
    );
    setOutside((prev) => (prev.length === out.length && prev.every((p, i) => p.id === out[i].id) ? prev : out));
  }

  // ---- Khởi tạo bản đồ (một lần) ----
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      // Cụm điểm phía tây vịnh Hạ Long – nếu căn khung thất bại vẫn thấy ghim
      center: [20.895, 107.04],
      zoom: 13,
      zoomControl: false,
      attributionControl: true
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');

    const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    });
    const sat = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics, GIS User Community'
      }
    );
    // CARTO Voyager (miễn phí, hợp lệ) thay cho ô bản đồ Google lấy trực tiếp (vi phạm điều khoản Google)
    const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'
    });
    baseLayersRef.current = { osm, sat, carto };
    let saved = 'osm';
    try {
      saved = localStorage.getItem(BASE_LAYER_KEY) || 'osm';
      if (!(saved in baseLayersRef.current)) saved = 'osm'; // giá trị cũ 'google' -> 'osm'
    } catch {
      /* ignore */
    }
    (baseLayersRef.current[saved as 'osm'] || osm).addTo(map);
    map.on('baselayerchange', (e: L.LayersControlEvent) => {
      const entry = Object.entries(baseLayersRef.current || {}).find(([, l]) => l === e.layer);
      if (entry) {
        try {
          localStorage.setItem(BASE_LAYER_KEY, entry[0]);
        } catch {
          /* ignore */
        }
      }
    });

    routeLayerRef.current = L.layerGroup().addTo(map);
    siteLayerRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (propsRef.current.clickToPlace) propsRef.current.onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    map.on('dragstart', () => propsRef.current.onUserInteract?.());

    mapRef.current = map;

    // Sửa kích thước khi bố cục thay đổi
    const el = containerRef.current;
    const tryInitialFit = () => {
      if (fittedRef.current || !propsRef.current.sites.length) return;
      if (el.clientWidth > 0 && el.clientHeight > 0 && fitAllInternal(false, true)) fittedRef.current = true;
    };
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            map.invalidateSize();
            tryInitialFit();
          })
        : null;
    map.on('zoomend', () => {
      declutterLabels();
      updateOutside();
    });
    map.on('moveend', updateOutside);
    ro?.observe(el);
    const onWin = () => map.invalidateSize();
    window.addEventListener('resize', onWin);
    const t1 = setTimeout(() => {
      map.invalidateSize();
      tryInitialFit();
    }, 250);

    return () => {
      clearTimeout(t1);
      ro?.disconnect();
      window.removeEventListener('resize', onWin);
      map.off();
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      userMarkerRef.current = null;
      userCircleRef.current = null;
      simMarkerRef.current = null;
      layersCtlRef.current = null;
      fittedRef.current = false;
    };
  }, []);

  // ---- Bộ chọn lớp nền (nhãn theo ngôn ngữ) ----
  useEffect(() => {
    const map = mapRef.current;
    const b = baseLayersRef.current;
    if (!map || !b) return;
    layersCtlRef.current?.remove();
    layersCtlRef.current = L.control
      .layers(
        {
          [`<span class="hl-layer-opt"><i class="fa-solid fa-map"></i> ${t.map}</span>`]: b.osm,
          [`<span class="hl-layer-opt"><i class="fa-solid fa-satellite"></i> ${t.sat}</span>`]: b.sat,
          [`<span class="hl-layer-opt"><i class="fa-solid fa-map-location-dot"></i> ${t.carto}</span>`]: b.carto
        },
        undefined,
        { position: 'topright', collapsed: true }
      )
      .addTo(map);
  }, [t]);

  // ---- Con trỏ khi bật chế độ đặt vị trí ----
  useEffect(() => {
    containerRef.current?.classList.toggle('hl-click-place', props.clickToPlace);
  }, [props.clickToPlace]);

  // ---- Nội dung popup (tạo khi mở để có khoảng cách mới nhất) ----
  const buildPopup = (site: HeritageSite): HTMLElement => {
    const p = propsRef.current;
    const tt = T[p.lang] || T.vi;
    const name = siteName(site, p.lang);
    const cat = siteText(site, p.lang, 'category');
    const dist = p.getDistance(site);
    const rating = typeof site.rating === 'number' ? site.rating.toFixed(1) : String(site.rating ?? '');
    const el = document.createElement('div');
    el.className = 'hl-popup';
    el.innerHTML = `
      <div class="hl-popup-img">
        <img src="${escapeHtml(site.image)}" alt="${escapeHtml(name)}" loading="lazy" />
        <span class="hl-popup-cat">${escapeHtml(cat)}</span>
      </div>
      <div class="hl-popup-body">
        <div class="hl-popup-title">${escapeHtml(name)}</div>
        <div class="hl-popup-meta">
          <span><i class="fa-solid fa-star"></i> ${rating}</span>
          <span><i class="fa-solid fa-bullseye"></i> ${tt.radius} ${site.rangeMeters} m</span>
          ${/^approx/i.test(site.coordSource || '') ? `<span title="${escapeHtml(tt.approxHint)}"><i class="fa-solid fa-circle-question"></i> ${tt.approx}</span>` : ''}
        </div>
        ${
          dist !== null
            ? `<div class="hl-popup-dist"><i class="fa-solid fa-route"></i> ${escapeHtml(tt.away.replace('{d}', formatDistance(dist, p.lang)))}</div>`
            : ''
        }
        <button type="button" class="hl-popup-btn primary" data-act="play"><i class="fa-solid fa-headphones"></i> ${tt.play}</button>
        <div class="hl-popup-row">
          <button type="button" class="hl-popup-btn" data-act="detail"><i class="fa-solid fa-circle-info"></i> ${tt.detail}</button>
          <button type="button" class="hl-popup-btn" data-act="qr"><i class="fa-solid fa-qrcode"></i> ${tt.qr}</button>
        </div>
      </div>`;
    const img = el.querySelector('img');
    if (img && site.fallbackImage) {
      img.addEventListener(
        'error',
        () => {
          if (img.src !== site.fallbackImage) img.src = site.fallbackImage;
        },
        { once: true }
      );
    }
    el.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
      if (!btn) return;
      ev.stopPropagation();
      const cur = propsRef.current;
      const act = btn.dataset.act;
      if (act === 'play') cur.onPlay(site);
      else if (act === 'detail') cur.onDetail(site);
      else if (act === 'qr') cur.onQr(site);
    });
    return el;
  };

  // ---- Ghim địa điểm + vòng geofence ----
  useEffect(() => {
    const map = mapRef.current;
    const group = siteLayerRef.current;
    if (!map || !group) return;
    let openId: number | undefined;
    markersRef.current.forEach((v, id) => {
      if (v.marker.isPopupOpen()) openId = id;
    });
    group.clearLayers();
    markersRef.current.clear();

    props.sites.forEach((site) => {
      if (!Number.isFinite(site.lat) || !Number.isFinite(site.lng)) return;
      const label = siteName(site, props.lang);
      const selected = site.id === propsRef.current.selectedId;
      const inside = site.id === propsRef.current.insideSiteId;
      const circle = L.circle([site.lat, site.lng], {
        radius: site.rangeMeters || 200,
        ...circleStyle(selected, inside),
        interactive: false
      }).addTo(group);
      const marker = L.marker([site.lat, site.lng], {
        icon: siteIcon(site, label, selected, inside),
        title: label,
        riseOnHover: true,
        zIndexOffset: selected ? 1000 : 0
      }).addTo(group);
      marker.bindPopup(() => buildPopup(site), {
        maxWidth: 260,
        minWidth: 240,
        className: 'hl-leaflet-popup',
        autoPanPadding: L.point(24, 24)
      });
      marker.on('click', () => propsRef.current.onSelect(site));
      markersRef.current.set(site.id, { marker, circle, site });
    });

    if (openId !== undefined) markersRef.current.get(openId)?.marker.openPopup();

    // Căn khung lần đầu – chỉ khi khung bản đồ đã có kích thước thật (tránh zoom 14 giữa biển)
    if (!fittedRef.current && props.sites.length) {
      if (fitAllInternal(false, true)) fittedRef.current = true;
      else
        requestAnimationFrame(() => {
          if (!fittedRef.current && fitAllInternal(false, true)) fittedRef.current = true;
        });
    }
    requestAnimationFrame(() => {
      declutterLabels();
      updateOutside();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.sites, props.lang]);

  // ---- Cập nhật trạng thái chọn / trong vùng (không dựng lại ghim) ----
  useEffect(() => {
    markersRef.current.forEach(({ marker, circle, site }) => {
      const selected = site.id === props.selectedId;
      const inside = site.id === props.insideSiteId;
      const label = siteName(site, props.lang);
      marker.setIcon(siteIcon(site, label, selected, inside));
      marker.setZIndexOffset(selected ? 1000 : inside ? 500 : 0);
      circle.setStyle(circleStyle(selected, inside));
    });
    requestAnimationFrame(() => declutterLabels());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedId, props.insideSiteId, props.sites, props.lang]);

  // ---- Tuyến tham quan ----
  useEffect(() => {
    const group = routeLayerRef.current;
    if (!group) return;
    group.clearLayers();
    const rs = props.routeSites;
    if (!rs || rs.length < 2) return;
    const pts = rs.map((s) => [s.lat, s.lng] as L.LatLngTuple);
    L.polyline(pts, { color: '#ffffff', weight: 7, opacity: 0.75, lineCap: 'round', interactive: false }).addTo(group);
    L.polyline(pts, {
      color: '#f59e0b',
      weight: 4,
      opacity: 0.95,
      dashArray: '10 10',
      lineCap: 'round',
      className: 'hl-route-line',
      interactive: false
    }).addTo(group);
    rs.forEach((s, i) =>
      L.marker([s.lat, s.lng], { icon: routeStepIcon(i + 1), interactive: false, zIndexOffset: 1500 }).addTo(group)
    );
  }, [props.routeSites]);

  // ---- Vị trí GPS thật ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const u = props.userPos;
    if (!u) {
      userMarkerRef.current?.remove();
      userCircleRef.current?.remove();
      userMarkerRef.current = null;
      userCircleRef.current = null;
      return;
    }
    const ll: L.LatLngTuple = [u.lat, u.lng];
    const acc = Math.max(5, Math.min(u.accuracy || 0, 5000));
    if (!userCircleRef.current) {
      userCircleRef.current = L.circle(ll, {
        radius: acc,
        color: '#2563eb',
        weight: 1,
        opacity: 0.5,
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
        interactive: false
      }).addTo(map);
    } else {
      userCircleRef.current.setLatLng(ll).setRadius(acc);
    }
    const heading = u.heading ?? null;
    const tt = T[props.lang] || T.vi;
    const tip = `${tt.you} · ${tt.acc} ±${Math.round(u.accuracy || 0)} m`;
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(ll, { icon: userIcon(heading), zIndexOffset: 2000, keyboard: false })
        .bindTooltip(tip, { direction: 'top', offset: [0, -12] })
        .addTo(map);
    } else {
      userMarkerRef.current.setLatLng(ll);
      userMarkerRef.current.setIcon(userIcon(heading));
      userMarkerRef.current.setTooltipContent(tip);
    }
    if (props.follow && !props.simPos) followTo(ll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.userPos, props.lang]);

  // ---- Vị trí mô phỏng (thuyền / ghim) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const s = props.simPos;
    if (!s) {
      simMarkerRef.current?.remove();
      simMarkerRef.current = null;
      lastHeadingRef.current = -999;
      return;
    }
    const ll: L.LatLngTuple = [s.lat, s.lng];
    const heading = Math.round(s.heading || 0);
    const tt = T[props.lang] || T.vi;
    if (!simMarkerRef.current) {
      simMarkerRef.current = L.marker(ll, {
        icon: props.simKind === 'boat' ? boatIcon(heading) : userIcon(null),
        zIndexOffset: 2500,
        keyboard: false
      })
        .bindTooltip(tt.sim, { direction: 'top', offset: [0, -18] })
        .addTo(map);
      lastHeadingRef.current = heading;
    } else {
      simMarkerRef.current.setLatLng(ll);
      if (props.simKind === 'boat' && Math.abs(heading - lastHeadingRef.current) >= 2) {
        // chỉ xoay mũi tên hướng, tránh dựng lại DOM mỗi khung hình
        const dir = simMarkerRef.current.getElement()?.querySelector('.hl-boat-dir') as HTMLElement | null;
        if (dir) dir.style.transform = `rotate(${heading}deg)`;
        else simMarkerRef.current.setIcon(boatIcon(heading));
        lastHeadingRef.current = heading;
      }
    }
    if (props.follow) followTo(ll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.simPos]);

  // Đổi kiểu biểu tượng mô phỏng
  useEffect(() => {
    if (!simMarkerRef.current) return;
    const h = Math.round(propsRef.current.simPos?.heading || 0);
    simMarkerRef.current.setIcon(props.simKind === 'boat' ? boatIcon(h) : userIcon(null));
    lastHeadingRef.current = h;
  }, [props.simKind]);

  useImperativeHandle(
    ref,
    () => ({
      flyToSite: (site, zoom = 15) => {
        mapRef.current?.flyTo([site.lat, site.lng], zoom, { duration: 1.1 });
      },
      flyTo: (p, zoom) => {
        const map = mapRef.current;
        if (!map) return;
        map.flyTo([p.lat, p.lng], zoom ?? Math.max(map.getZoom(), 15), { duration: 0.9 });
      },
      fitAll: () => fitAllInternal(true),
      fitRoute: () => {
        const map = mapRef.current;
        const rs = propsRef.current.routeSites;
        if (!map || !rs || rs.length < 2) return;
        map.flyToBounds(L.latLngBounds(rs.map((s) => [s.lat, s.lng] as L.LatLngTuple)), {
          padding: [60, 60],
          maxZoom: 14,
          duration: 1
        });
      },
      openPopup: (siteId) => {
        markersRef.current.get(siteId)?.marker.openPopup();
      }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className={props.className || 'relative w-full h-full'}>
      <div ref={containerRef} className="hl-map absolute inset-0" role="application" aria-label={t.map} />
      {outside.length > 0 && (
        <button
          type="button"
          onClick={() => fitAllInternal(true)}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] inline-flex items-center gap-1.5 rounded-full bg-white/95 border border-slate-200 shadow-sm px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition whitespace-nowrap"
          title={outside.map((s) => siteName(s, props.lang)).join(', ')}
        >
          <i className="fa-solid fa-location-arrow text-sky-600"></i>
          {t.outside.replace('{n}', String(outside.length))} · {t.showAll}
        </button>
      )}
    </div>
  );
});

MapView.displayName = 'MapView';
