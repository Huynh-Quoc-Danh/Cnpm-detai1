// Trang Bản đồ: bản đồ GPS + bảng điều khiển thuyết minh (giống mẫu thiết kế), geofence tự động, mô phỏng hành trình.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LanguageDropdown } from './Navbar';
import { siteName, tr } from '../i18n';
import type { HeritageSite, LanguageCode } from '../types';
import { recommendedRoutes } from '../data/mockData';
import { useSites } from '../context/SitesContext';
import { useNarration } from '../context/NarrationContext';
import { findNearestSite, formatDistance, haversineMeters } from '../services/geo';
import { useGeolocation } from '../hooks/useGeolocation';
import { SiteQrModal } from './qr/SiteQrModal';
import { MapView, type MapPoint, type MapViewHandle } from './map/MapView';
import { MapToolbar } from './map/MapToolbar';
import { AudioCard } from './map/AudioCard';
import { ExhibitList } from './map/ExhibitList';
import { SiteList } from './map/SiteList';
import { useCruise } from './map/useCruise';

export interface MapTabProps {
  lang: LanguageCode;
  onChangeLang: (l: LanguageCode) => void;
  focusedSite: HeritageSite | null;
  onOpenDetail: (site: HeritageSite) => void;
  onGpsSiteChange?: (
    siteId: number | null,
    coords: { lat: number; lng: number; accuracy: number } | null,
    source: 'gps' | 'sim'
  ) => void;
}

const COOLDOWN_MS = 10 * 60 * 1000;
const EXIT_FACTOR = 1.2;
const AUTOPLAY_KEY = 'hl_map_autoplay';

function readBool(key: string, def: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? def : v === '1';
  } catch {
    return def;
  }
}
function writeBool(key: string, v: boolean) {
  try {
    localStorage.setItem(key, v ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/** Điểm xuất phát lùi ra ngoài vùng geofence để thấy rõ lúc "vào vùng". */
function leadInPoint(a: HeritageSite, b: HeritageSite): { lat: number; lng: number } {
  const d = haversineMeters(a, b) || 1;
  const back = Math.max(600, (a.rangeMeters || 300) * 3);
  const k = back / d;
  return { lat: a.lat + (a.lat - b.lat) * k, lng: a.lng + (a.lng - b.lng) * k };
}

export const MapTab: React.FC<MapTabProps> = ({ lang, onChangeLang, focusedSite, onOpenDetail, onGpsSiteChange }) => {
  const { sites, offline, reload } = useSites();
  const { playSite, track, status } = useNarration();
  const geo = useGeolocation();
  const cruise = useCruise();
  const mapRef = useRef<MapViewHandle | null>(null);

  const [online, setOnline] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(focusedSite?.id ?? null);
  const [routeId, setRouteId] = useState<string>('none');
  const [manualPos, setManualPos] = useState<{ lat: number; lng: number } | null>(null);
  const [clickToPlace, setClickToPlace] = useState(false);
  const [autoPlay, setAutoPlay] = useState(() => readBool(AUTOPLAY_KEY, false));
  const [follow, setFollow] = useState(false);
  const [insideSiteId, setInsideSiteId] = useState<number | null>(null);
  const [banner, setBanner] = useState<{ siteId: number } | null>(null);
  const [qrSite, setQrSite] = useState<HeritageSite | null>(null);

  const userPickedRef = useRef(!!focusedSite);
  const insideRef = useRef<number | null>(null);
  const hadPosRef = useRef(false);
  const onGpsRef = useRef(onGpsSiteChange);
  onGpsRef.current = onGpsSiteChange;
  // Unmount (tab switch): GPS watch and cruise stop, so clear the reported position.
  useEffect(() => () => onGpsRef.current?.(null, null, 'gps'), []);
  const cooldownRef = useRef<Map<number, number>>(new Map());
  const lastReportRef = useRef(0);
  const pendingLocateRef = useRef(false);

  // ---- Kiểm tra kết nối máy chủ (mỗi 30 giây) ----
  useEffect(() => {
    let alive = true;
    const check = async () => {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 8000);
      try {
        const res = await fetch('/api/health', { signal: ctl.signal, cache: 'no-store' });
        const data = res.ok ? await res.json().catch(() => null) : null;
        if (alive) setOnline(!!data?.ok);
      } catch {
        if (alive) setOnline(false);
      } finally {
        clearTimeout(to);
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Máy chủ đã trực tuyến lại nhưng đang dùng dữ liệu ngoại tuyến -> tải lại
  useEffect(() => {
    if (online && offline) reload().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // ---- Vị trí hiện hành (mô phỏng ưu tiên hơn GPS thật) ----
  const cruiseHasPos = cruise.state.status !== 'idle' && !!cruise.state.pos;
  const simulating = cruiseHasPos || !!manualPos;
  const activePos = useMemo<{ lat: number; lng: number; accuracy: number } | null>(() => {
    if (cruiseHasPos && cruise.state.pos) return { ...cruise.state.pos, accuracy: 10 };
    if (manualPos) return { ...manualPos, accuracy: 10 };
    if (geo.coords) return { lat: geo.coords.lat, lng: geo.coords.lng, accuracy: geo.coords.accuracy };
    return null;
  }, [cruiseHasPos, cruise.state.pos, manualPos, geo.coords]);
  const source: 'gps' | 'sim' = simulating ? 'sim' : 'gps';
  const activePosRef = useRef(activePos);
  activePosRef.current = activePos;

  const siteById = useCallback((id: number | null) => sites.find((s) => s.id === id) || null, [sites]);
  const selectedSite = siteById(selectedId) || sites[0] || null;

  // ---- Chọn địa điểm mặc định ----
  useEffect(() => {
    if (!sites.length) return;
    if (selectedId === null || !sites.some((s) => s.id === selectedId)) setSelectedId(sites[0].id);
  }, [sites, selectedId]);

  // Lần đầu biết vị trí: chọn điểm gần nhất (nếu người dùng chưa tự chọn)
  useEffect(() => {
    if (!activePos || userPickedRef.current || !sites.length) return;
    const n = findNearestSite(sites, activePos.lat, activePos.lng);
    if (n) {
      userPickedRef.current = true;
      setSelectedId(n.site.id);
    }
  }, [activePos, sites]);

  // Bay tới địa điểm được chọn từ trang khác
  useEffect(() => {
    if (!focusedSite) return;
    userPickedRef.current = true;
    setSelectedId(focusedSite.id);
    const s = sites.find((x) => x.id === focusedSite.id) || focusedSite;
    const t = setTimeout(() => mapRef.current?.flyToSite(s, 15), 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedSite]);

  // Bay tới vị trí khi bấm "Vị trí của tôi" trước khi có tín hiệu
  useEffect(() => {
    if (pendingLocateRef.current && geo.coords && !simulating) {
      pendingLocateRef.current = false;
      mapRef.current?.flyTo(geo.coords, 16);
    }
  }, [geo.coords, simulating]);

  // ---- Geofence: vào/ra vùng (có trễ khi ra 1.2x, chờ 10 phút cho mỗi điểm) ----
  useEffect(() => {
    if (!activePos || !sites.length) {
      if (insideRef.current !== null || hadPosRef.current) {
        insideRef.current = null;
        hadPosRef.current = false;
        setInsideSiteId(null);
        setBanner(null);
        // Cruise stopped / pin removed / GPS lost: stop reporting the old position
        onGpsSiteChange?.(null, null, source);
      }
      return;
    }
    hadPosRef.current = true;
    let cur = insideRef.current;
    if (cur !== null) {
      const s = sites.find((x) => x.id === cur);
      if (!s || haversineMeters(activePos, s) > (s.rangeMeters || 0) * EXIT_FACTOR) cur = null;
    }
    if (cur === null) {
      const n = findNearestSite(sites, activePos.lat, activePos.lng);
      if (n?.inside) cur = n.site.id;
    }
    const now = Date.now();
    if (cur !== insideRef.current) {
      insideRef.current = cur;
      setInsideSiteId(cur);
      lastReportRef.current = now;
      onGpsSiteChange?.(cur, activePos, source);
      if (cur === null) {
        setBanner(null);
      } else {
        const site = sites.find((x) => x.id === cur)!;
        const last = cooldownRef.current.get(cur) || 0;
        userPickedRef.current = true;
        setSelectedId(cur);
        if (now - last > COOLDOWN_MS) {
          cooldownRef.current.set(cur, now);
          setBanner({ siteId: cur });
          if (autoPlay) playSite(site, { lang });
        }
      }
    } else if (now - lastReportRef.current > 5000) {
      lastReportRef.current = now;
      onGpsSiteChange?.(cur, activePos, source);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePos, sites]);

  // ---- Tuyến ----
  const routeSites = useMemo<HeritageSite[] | null>(() => {
    if (routeId === 'none') return null;
    if (routeId === 'all') return [...sites].sort((a, b) => a.lng - b.lng);
    const r = recommendedRoutes.find((x) => x.id === routeId);
    if (!r) return null;
    const list = r.poiIds.map((id) => sites.find((s) => s.id === id)).filter(Boolean) as HeritageSite[];
    return list.length >= 2 ? list : null;
  }, [routeId, sites]);

  const handleRouteChange = (id: string) => {
    setRouteId(id);
    if (cruise.state.status !== 'idle') cruise.stop();
    setTimeout(() => (id === 'none' ? mapRef.current?.fitAll() : mapRef.current?.fitRoute()), 50);
  };

  const startCruise = () => {
    let list = routeSites;
    if (!list) {
      list = [...sites].sort((a, b) => a.lng - b.lng);
      setRouteId('all');
    }
    if (list.length < 2) return;
    setManualPos(null);
    setClickToPlace(false);
    cooldownRef.current.clear();
    insideRef.current = null;
    setInsideSiteId(null);
    setBanner(null);
    const path = [leadInPoint(list[0], list[1]), ...list.map((s) => ({ lat: s.lat, lng: s.lng }))];
    cruise.start(path);
    setFollow(true);
    setTimeout(() => mapRef.current?.fitRoute(), 60);
  };

  const clearSim = () => {
    cruise.stop();
    setManualPos(null);
    setClickToPlace(false);
  };

  const handleMapClick = (p: { lat: number; lng: number }) => {
    if (cruise.state.status !== 'idle') cruise.stop();
    setManualPos(p);
  };

  const handleLocate = () => {
    if (simulating && activePos) {
      mapRef.current?.flyTo(activePos, 15);
      return;
    }
    if (geo.coords) {
      mapRef.current?.flyTo(geo.coords, 16);
      setFollow(true);
    } else {
      pendingLocateRef.current = true;
      geo.start();
    }
  };

  const pickSite = (site: HeritageSite) => {
    userPickedRef.current = true;
    setSelectedId(site.id);
    setFollow(false);
    mapRef.current?.flyToSite(site, 15);
  };

  const getDistance = useCallback((site: HeritageSite) => {
    const p = activePosRef.current;
    return p ? haversineMeters(p, site) : null;
  }, []);

  const nearest = useMemo(
    () => (activePos ? findNearestSite(sites, activePos.lat, activePos.lng) : null),
    [activePos, sites]
  );

  const bannerSite = banner ? siteById(banner.siteId) : null;
  const bannerDist = bannerSite && activePos ? haversineMeters(activePos, bannerSite) : null;
  const bannerPlaying = !!bannerSite && track?.siteId === bannerSite.id && !track?.exhibitId && status === 'playing';

  const userPos: MapPoint | null = geo.coords
    ? { lat: geo.coords.lat, lng: geo.coords.lng, accuracy: geo.coords.accuracy, heading: geo.coords.heading }
    : null;
  const simPos: MapPoint | null =
    cruiseHasPos && cruise.state.pos
      ? { ...cruise.state.pos, heading: cruise.state.heading }
      : manualPos
        ? { ...manualPos }
        : null;

  const toggleAutoPlay = () =>
    setAutoPlay((v) => {
      writeBool(AUTOPLAY_KEY, !v);
      return !v;
    });

  const renderBanner = (compact = false) =>
    bannerSite ? (
      <div
        className={`hl-banner-in flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-sm ${
          compact ? 'px-3 py-2' : 'px-4 py-3'
        }`}
        role="status"
      >
        <span className="relative flex w-9 h-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
          <i className="fa-solid fa-location-dot relative" />
        </span>
        <p className="min-w-0 flex-1 text-xs sm:text-sm text-emerald-900 leading-snug">
          {tr(lang, { vi: 'Bạn đang ở gần ', en: 'You are near ', ko: '현재 위치 근처: ', ja: '現在地の近く：', zh: '您正在附近：' })}
          <b className="break-words">{siteName(bannerSite, lang)}</b>
          {bannerDist !== null && <span className="text-emerald-700"> ({formatDistance(bannerDist, lang)})</span>}
        </p>
        <button
          type="button"
          onClick={() => playSite(bannerSite, { lang })}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-sm"
        >
          <i className={`fa-solid ${bannerPlaying ? 'fa-volume-high' : 'fa-headphones'}`} />
          <span className={compact ? 'hidden sm:inline' : ''}>
            {bannerPlaying
              ? tr(lang, { vi: 'Đang phát', en: 'Playing', ko: '재생 중', ja: '再生中', zh: '正在播放' })
              : tr(lang, { vi: 'Nghe thuyết minh', en: 'Listen', ko: '해설 듣기', ja: '解説を聞く', zh: '收听讲解' })}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setBanner(null)}
          className="shrink-0 w-7 h-7 rounded-full text-emerald-700/60 hover:bg-emerald-100 hover:text-emerald-800"
          aria-label={tr(lang, { vi: 'Đóng', en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' })}
        >
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
    ) : null;

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4">
      {/* Thanh trên: ngôn ngữ + trạng thái */}
      <div className="flex flex-wrap items-center gap-3 justify-between bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3">
        <div className="flex items-center gap-2.5">
          <label htmlFor="hl-map-lang" className="text-sm font-bold text-slate-700">
            <i className="fa-solid fa-language text-sky-600 mr-1.5" />
            {tr(lang, { vi: 'Ngôn ngữ:', en: 'Language:', ko: '언어:', ja: '言語：', zh: '语言：' })}
          </label>
          <LanguageDropdown id="hl-map-lang" lang={lang} onChange={onChangeLang} full align="left" />
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-medium">
          <i className="fa-solid fa-satellite text-sky-500" />
          {tr(lang, {
            vi: 'Bản đồ số & Thuyết minh tự động theo GPS',
            en: 'Digital map & GPS-triggered narration',
            ko: '디지털 지도 & GPS 자동 해설',
            ja: 'デジタルマップ＆GPS自動解説',
            zh: '数字地图与 GPS 自动讲解'
          })}
        </div>

        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold border ${
            online ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
          title={
            online
              ? 'API /api/health OK'
              : tr(lang, {
                  vi: 'Không kết nối được máy chủ',
                  en: 'Server unreachable',
                  ko: '서버에 연결할 수 없어요',
                  ja: 'サーバーに接続できません',
                  zh: '无法连接服务器'
                })
          }
        >
          <span className="relative flex w-2.5 h-2.5">
            {online && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />}
            <span className={`relative w-2.5 h-2.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </span>
          {online
            ? tr(lang, { vi: 'Trực tuyến', en: 'Online', ko: '온라인', ja: 'オンライン', zh: '在线' })
            : tr(lang, { vi: 'Ngoại tuyến', en: 'Offline', ko: '오프라인', ja: 'オフライン', zh: '离线' })}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        {/* Bản đồ */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col lg:h-[calc(100vh-220px)] lg:min-h-[520px]">
          <MapToolbar
            lang={lang}
            routes={recommendedRoutes}
            routeId={routeId}
            onRouteChange={handleRouteChange}
            cruiseStatus={cruise.state.status}
            cruiseProgress={cruise.state.progress}
            speed={cruise.state.speedFactor}
            onSpeed={cruise.setSpeed}
            onCruiseStart={startCruise}
            onCruisePause={cruise.pause}
            onCruiseResume={cruise.resume}
            onCruiseStop={clearSim}
            clickToPlace={clickToPlace}
            onToggleClickToPlace={() => setClickToPlace((v) => !v)}
            hasManualPos={!!manualPos || cruise.state.status === 'finished'}
            onClearSim={clearSim}
            autoPlay={autoPlay}
            onToggleAutoPlay={toggleAutoPlay}
          />
          <div className="relative isolate flex-1 h-[55vh] min-h-[340px] lg:h-auto lg:min-h-0">
            <MapView
              ref={mapRef}
              className="absolute inset-0"
              sites={sites}
              lang={lang}
              selectedId={selectedSite?.id ?? null}
              insideSiteId={insideSiteId}
              userPos={userPos}
              simPos={simPos}
              simKind={cruiseHasPos ? 'boat' : 'pin'}
              routeSites={routeSites}
              follow={follow}
              clickToPlace={clickToPlace}
              onMapClick={handleMapClick}
              onSelect={(s) => {
                userPickedRef.current = true;
                setSelectedId(s.id);
              }}
              onPlay={(s) => playSite(s, { lang })}
              onDetail={onOpenDetail}
              onQr={(s) => setQrSite(s)}
              onUserInteract={() => setFollow(false)}
              getDistance={getDistance}
            />

            {/* Chip thông tin vị trí */}
            <div className="absolute top-3 left-3 z-[1000] max-w-[calc(100%-5rem)] pointer-events-none">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/95 backdrop-blur border border-slate-200 shadow-sm px-3 py-1.5 text-[11px] font-semibold text-slate-700">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    simulating ? 'bg-violet-500' : geo.status === 'watching' ? 'bg-blue-500' : 'bg-slate-300'
                  }`}
                />
                <span className="truncate">
                  {simulating
                    ? cruiseHasPos
                      ? cruise.state.dwelling && cruise.state.status === 'running'
                        ? tr(lang, {
                            vi: 'Tàu đang ghé điểm tham quan',
                            en: 'Boat stopping at a site',
                            ko: '배가 관광지에 정박 중이에요',
                            ja: '船が観光地に停泊中です',
                            zh: '游船正在停靠景点'
                          })
                        : tr(lang, {
                            vi: 'Đang mô phỏng hành trình tàu',
                            en: 'Simulating boat cruise',
                            ko: '유람선 항해 시뮬레이션 중',
                            ja: '遊覧船の航路をシミュレーション中',
                            zh: '正在模拟游船航程'
                          })
                      : tr(lang, { vi: 'Vị trí giả lập', en: 'Simulated position', ko: '가상 위치', ja: '仮想位置', zh: '模拟位置' })
                    : geo.status === 'watching'
                      ? `GPS ±${Math.round(geo.coords?.accuracy || 0)} m`
                      : tr(lang, {
                          vi: 'Chưa có vị trí',
                          en: 'No position yet',
                          ko: '아직 위치 정보가 없어요',
                          ja: 'まだ位置情報がありません',
                          zh: '尚未获取位置'
                        })}
                  {nearest && (
                    <span className="text-slate-500 font-medium">
                      {' · '}
                      {nearest.inside
                        ? tr(lang, { vi: 'Trong vùng ', en: 'Inside ', ko: '구역 안: ', ja: 'エリア内：', zh: '位于范围内：' })
                        : tr(lang, { vi: 'Gần nhất: ', en: 'Nearest: ', ko: '가장 가까운 곳: ', ja: '最寄り：', zh: '最近：' })}
                      {siteName(nearest.site, lang).replace(/\s*\(.*?\)/, '')}{' '}
                      {!nearest.inside && formatDistance(nearest.distance, lang)}
                    </span>
                  )}
                </span>
              </div>
              {clickToPlace && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-violet-600 text-white shadow px-3 py-1.5 text-[11px] font-bold">
                  <i className="fa-solid fa-hand-pointer" />
                  {tr(lang, {
                    vi: 'Click lên bản đồ để đặt vị trí',
                    en: 'Click on the map to place yourself',
                    ko: '지도를 클릭해 위치를 지정하세요',
                    ja: '地図をクリックして位置を設定してください',
                    zh: '点击地图设置您的位置'
                  })}
                </div>
              )}
            </div>

            {/* Nút điều khiển nổi */}
            <div className="absolute left-3 bottom-10 z-[1000] flex flex-col gap-2">
              <button
                type="button"
                onClick={handleLocate}
                className="hl-fab"
                title={tr(lang, { vi: 'Vị trí của tôi', en: 'My location', ko: '내 위치', ja: '現在地', zh: '我的位置' })}
                aria-label={tr(lang, { vi: 'Vị trí của tôi', en: 'My location', ko: '내 위치', ja: '現在地', zh: '我的位置' })}
              >
                <i
                  className={`fa-solid fa-location-crosshairs ${
                    geo.status === 'prompt' ? 'fa-beat-fade text-sky-500' : geo.status === 'watching' ? 'text-blue-600' : ''
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={() => setFollow((v) => !v)}
                className={`hl-fab ${follow ? 'is-on' : ''}`}
                title={tr(lang, { vi: 'Bám theo vị trí', en: 'Follow position', ko: '위치 따라가기', ja: '現在地を追従', zh: '跟随位置' })}
                aria-label={tr(lang, { vi: 'Bám theo vị trí', en: 'Follow position', ko: '위치 따라가기', ja: '現在地を追従', zh: '跟随位置' })}
                aria-pressed={follow}
              >
                <i className="fa-solid fa-location-arrow" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setFollow(false);
                  mapRef.current?.fitAll();
                }}
                className="hl-fab"
                title={tr(lang, { vi: 'Xem toàn bộ các điểm', en: 'Show all sites', ko: '모든 관광지 보기', ja: 'すべてのスポットを表示', zh: '显示全部景点' })}
                aria-label={tr(lang, { vi: 'Xem toàn bộ các điểm', en: 'Show all sites', ko: '모든 관광지 보기', ja: 'すべてのスポットを表示', zh: '显示全部景点' })}
              >
                <i className="fa-solid fa-expand" />
              </button>
            </div>

            {/* Thông báo vào vùng (di động) */}
            {bannerSite && (
              <div className="lg:hidden absolute left-3 right-3 top-12 z-[1000]">
                {renderBanner(true)}
              </div>
            )}
          </div>
        </div>

        {/* Bảng bên phải */}
        <aside className="hl-scroll space-y-4 lg:h-[calc(100vh-220px)] lg:min-h-[520px] lg:overflow-y-auto lg:pr-1">
          {bannerSite && (
            <div className="hidden lg:block">
              {renderBanner()}
            </div>
          )}
          <AudioCard
            site={selectedSite}
            lang={lang}
            sitesCount={sites.length}
            online={online && !offline}
            gpsStatus={geo.status}
            gpsAccuracy={geo.coords?.accuracy ?? null}
            gpsError={geo.error}
            simulating={simulating}
            onStartGps={() => {
              pendingLocateRef.current = true;
              geo.start();
            }}
            onOpenQr={(s) => setQrSite(s)}
          />
          <ExhibitList site={selectedSite} lang={lang} />
          <SiteList
            sites={sites}
            lang={lang}
            selectedId={selectedSite?.id ?? null}
            insideSiteId={insideSiteId}
            position={activePos}
            onPick={pickSite}
          />
          <p className="text-[11px] text-slate-400 text-center px-2 pb-2">
            <i className="fa-solid fa-circle-info mr-1" />
            {tr(lang, {
              vi: 'Tọa độ GPS theo WGS84. Ghim màu xanh lá: bạn đang trong vùng thuyết minh.',
              en: 'GPS coordinates in WGS84. Green pin: you are inside the narration zone.',
              ko: 'GPS 좌표는 WGS84 기준이에요. 초록색 핀: 해설 구역 안에 있어요.',
              ja: 'GPS座標はWGS84です。緑のピン：解説エリア内にいます。',
              zh: 'GPS 坐标采用 WGS84。绿色图钉：您位于讲解范围内。'
            })}
          </p>
        </aside>
      </div>

      {qrSite && <SiteQrModal site={qrSite} isOpen={!!qrSite} onClose={() => setQrSite(null)} lang={lang} />}
    </div>
  );
};

export default MapTab;
