import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LanguageCode,
  CategoryKey,
  ActiveTab,
  ViewMode,
  HeritageSite,
  ChatMessage,
  TicketPackage
} from './types';
import { uiTranslations } from './data/mockData';
import { appController, pkgBadge, pkgName, setPackageCatalog, setSiteCatalog } from './services/architectureEngine';
import { api, formatVnd } from './services/api';
import { setHeartbeatSite, startHeartbeat, type HeartbeatState } from './services/visitor';
import { SitesProvider, useSites } from './context/SitesContext';
import { EntitlementProvider, useEntitlement } from './context/EntitlementContext';
import { NarrationProvider, useNarration } from './context/NarrationContext';
import { Navbar, formatRemaining, useNow } from './components/Navbar';
import { ExploreTab } from './components/ExploreTab';
import { PoiDetailModal } from './components/PoiDetailModal';
import { MapTab } from './components/MapTab';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { ChatbotModal } from './components/ChatbotModal';
import { SiteQrModal } from './components/qr/SiteQrModal';
import { AppQrModal } from './components/qr/AppQrModal';
import { useOverlay } from './hooks/useOverlay';
import { isLanguageCode, languageMeta, numberLocale, siteName, siteText, tr, trf } from './i18n';

const LANG_KEY = 'app_lang';
const TAB_KEY = 'hl_active_tab';
const QR_SESSION_KEY = 'hl_qr_site';
const QR_VALID_MS = 30 * 60 * 1000;
const TABS: ActiveTab[] = ['explore', 'map', 'favorites', 'settings'];
const APP_OPENED = {
  vi: 'Đã mở ứng dụng trên điện thoại',
  en: 'App opened on your phone',
  ko: '휴대폰에서 앱을 열었어요',
  ja: 'スマホでアプリを開きました',
  zh: '已在手机上打开应用'
};

/** ?lang=ko (link chia sẻ) > localStorage > 'vi'. Chấp nhận vi | en | ko | ja | zh. */
function readLang(): LanguageCode {
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (isLanguageCode(q)) return q;
    const stored = localStorage.getItem(LANG_KEY);
    return isLanguageCode(stored) ? stored : 'vi';
  } catch {
    return 'vi';
  }
}

function safeJson<T>(raw: string | null, def: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : def;
  } catch {
    return def;
  }
}

/** Deep link parsed once at startup: /?site=<id>&src=qr | /?src=app */
interface DeepLink {
  siteId: number | null;
  src: string | null;
}

/** Pure parse (no side effects – safe under React StrictMode double render). */
function parseDeepLink(): DeepLink {
  try {
    const p = new URLSearchParams(window.location.search);
    const raw = p.get('site');
    const siteId = raw && /^\d+$/.test(raw) ? Number(raw) : null;
    const src = p.get('src');
    return { siteId, src };
  } catch {
    return { siteId: null, src: null };
  }
}

/** Remove ?site=&src= from the address bar (keep path, other params and hash). */
function cleanDeepLinkUrl(): void {
  try {
    const p = new URLSearchParams(window.location.search);
    if (!p.has('site') && !p.has('src')) return;
    p.delete('site');
    p.delete('src');
    const rest = p.toString();
    window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash);
  } catch {
    /* ignore */
  }
}

/** Evaluated once when the module loads, before any render. */
const INITIAL_DEEP_LINK: DeepLink = typeof window !== 'undefined' ? parseDeepLink() : { siteId: null, src: null };

// ---------------------------------------------------------------------------
// Root: providers
// ---------------------------------------------------------------------------
export const App: React.FC = () => {
  const [lang, setLangState] = useState<LanguageCode>(readLang);

  const setLang = useCallback((l: LanguageCode) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    // BCP-47 (vi-VN, en-US, ko-KR, ja-JP, zh-CN) để trình duyệt chọn đúng phông CJK
    document.documentElement.lang = languageMeta(lang).bcp47;
  }, [lang]);

  return (
    <SitesProvider>
      <EntitlementProvider lang={lang}>
        <NarrationProvider lang={lang}>
          <AppShell lang={lang} setLang={setLang} />
        </NarrationProvider>
      </EntitlementProvider>
    </SitesProvider>
  );
};

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------
const AppShell: React.FC<{ lang: LanguageCode; setLang: (l: LanguageCode) => void }> = ({ lang, setLang }) => {
  const dict = uiTranslations[lang] || uiTranslations.en;
  const { sites, loading, offline, getSite } = useSites();
  const entitlement = useEntitlement();
  const narration = useNarration();

  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [activeTab, setActiveTabState] = useState<ActiveTab>(() => {
    try {
      const t = sessionStorage.getItem(TAB_KEY) as ActiveTab | null;
      return t && TABS.includes(t) ? t : 'explore';
    } catch {
      return 'explore';
    }
  });
  const setActiveTab = useCallback((t: ActiveTab) => {
    setActiveTabState(t);
    try {
      sessionStorage.setItem(TAB_KEY, t);
    } catch {
      /* ignore */
    }
    window.scrollTo({ top: 0 });
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('All');
  const [favorites, setFavorites] = useState<number[]>(() => safeJson(localStorage.getItem('fav_sites'), [1, 2]));
  const [listenedCount, setListenedCount] = useState<number>(() =>
    parseInt(localStorage.getItem('listened_count') || '0', 10) || 0
  );

  const [detailSiteId, setDetailSiteId] = useState<number | null>(null);
  const [focusedMapSite, setFocusedMapSite] = useState<HeritageSite | null>(null);
  const [qrSite, setQrSite] = useState<HeritageSite | null>(null);
  const [appQrOpen, setAppQrOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [welcomeSiteId, setWelcomeSiteId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string; icon: string } | null>(null);

  const [previewSec, setPreviewSec] = useState(30);
  const [packages, setPackages] = useState<TicketPackage[]>([]);

  const detailSite = detailSiteId != null ? getSite(detailSiteId) || null : null;
  const welcomeSite = welcomeSiteId != null ? getSite(welcomeSiteId) || null : null;

  const showToast = useCallback((text: string, icon = 'fa-circle-check') => {
    setToast({ id: Date.now(), text, icon });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Log mô phỏng của appController không còn hiển thị (đã bỏ trang Kiến trúc)
  const appendArchitectureLogs = useCallback(() => {}, []);

  // ----- Chatbot -----
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    { id: 'WELCOME', sender: 'bot', text: (uiTranslations[lang] || uiTranslations.en).chatInitialGreeting, timestamp: 'Now' }
  ]);

  // ----- Config + packages (preview length, prices for the chatbot/CTA) -----
  useEffect(() => {
    let alive = true;
    api
      .getConfig()
      .then((c) => alive && c && Number(c.previewSeconds) > 0 && setPreviewSec(Number(c.previewSeconds)))
      .catch(() => undefined);
    api
      .getPackages()
      .then((p) => {
        if (!alive || !Array.isArray(p)) return;
        setPackages(p);
        setPackageCatalog(p);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setSiteCatalog(sites);
  }, [sites]);

  const minPrice = useMemo(() => {
    const prices = packages.filter((p) => p.isActive !== false && p.price > 0).map((p) => p.price);
    return prices.length ? Math.min(...prices) : null;
  }, [packages]);

  // ----- Visitor heartbeat (admin live dashboard) -----
  const hbRef = useRef<HeartbeatState>({ siteId: null, source: 'view' });
  const langRef = useRef(lang);
  langRef.current = lang;
  useEffect(() => {
    // Restore a QR scan from this browser session (valid 30 min).
    const saved = safeJson<{ siteId: number; at: number } | null>(sessionStorage.getItem(QR_SESSION_KEY), null);
    if (saved && Date.now() - saved.at < QR_VALID_MS) setHeartbeatSite(saved.siteId, 'qr');
    const stop = startHeartbeat(() => ({ ...hbRef.current, lang: langRef.current }));
    return stop;
  }, []);

  const lastGeoSiteRef = useRef<number | null>(null);
  // Leaving the map stops GPS / cruise simulation, so stop reporting that position.
  useEffect(() => {
    if (activeTab !== 'map') {
      hbRef.current = { siteId: null, source: 'view' };
      lastGeoSiteRef.current = null;
    }
  }, [activeTab]);
  const handleGpsSiteChange = useCallback(
    (
      siteId: number | null,
      coords: { lat: number; lng: number; accuracy: number } | null,
      source: 'gps' | 'sim'
    ) => {
      hbRef.current = {
        siteId,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        accuracy: coords?.accuracy ?? null,
        source: coords || siteId != null ? source : 'view'
      };
      if (siteId != null && siteId !== lastGeoSiteRef.current && coords) {
        appController.evaluateGpsPosition(coords.lat, coords.lng, appendArchitectureLogs);
      }
      lastGeoSiteRef.current = siteId;
    },
    [appendArchitectureLogs]
  );

  // ----- Deep links -----
  const deepLinkRef = useRef<DeepLink>(INITIAL_DEEP_LINK);
  const deepLinkDoneRef = useRef(false);
  useEffect(() => {
    cleanDeepLinkUrl();
  }, []);
  useEffect(() => {
    const dl = deepLinkRef.current;
    if (!dl || deepLinkDoneRef.current) return;
    if (dl.siteId == null) {
      deepLinkDoneRef.current = true;
      if (dl.src === 'app') {
        showToast(tr(lang, APP_OPENED), 'fa-mobile-screen-button');
      }
      return;
    }
    // Wait for the real (API) site list: the offline copy only has the 7 bundled sites, so a QR for a
    // site created in the admin would otherwise be reported "not found".
    if (loading) return;
    deepLinkDoneRef.current = true;
    const site = getSite(dl.siteId);
    if (!site) {
      showToast(
        tr(lang, {
          vi: 'Không tìm thấy điểm tham quan trong mã QR',
          en: 'Site in QR code not found',
          ko: 'QR 코드의 명소를 찾을 수 없습니다',
          ja: 'QRコードのスポットが見つかりません',
          zh: '未找到二维码对应的景点'
        }),
        'fa-triangle-exclamation'
      );
      return;
    }
    setActiveTab('explore');
    setDetailSiteId(site.id);
    if (dl.src === 'qr') {
      setHeartbeatSite(site.id, 'qr');
      try {
        sessionStorage.setItem(QR_SESSION_KEY, JSON.stringify({ siteId: site.id, at: Date.now() }));
      } catch {
        /* ignore */
      }
      setWelcomeSiteId(site.id);
    } else if (dl.src === 'app') {
      showToast(tr(lang, APP_OPENED), 'fa-mobile-screen-button');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, sites]);

  // ----- Listen counter + architecture log when a new track starts -----
  const countedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const t = narration.track;
    if (!t || narration.status !== 'playing' || countedKeyRef.current === t.key) return;
    countedKeyRef.current = t.key;
    setListenedCount((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem('listened_count', String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    appController.triggerAudioNarration(t.siteId, t.lang, appendArchitectureLogs);
  }, [narration.track, narration.status, appendArchitectureLogs]);

  // ----- Favorites -----
  const handleToggleFavorite = useCallback((id: number) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem('fav_sites', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const filteredSites = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return sites.filter((site) => {
      const matchQ =
        !q ||
        site.name.toLowerCase().includes(q) ||
        site.nameVi.toLowerCase().includes(q) ||
        site.shortDescVi.toLowerCase().includes(q) ||
        site.shortDescEn.toLowerCase().includes(q) ||
        siteName(site, lang).toLowerCase().includes(q) ||
        siteText(site, lang, 'shortDesc').toLowerCase().includes(q);
      const matchCat = selectedCategory === 'All' || site.categoryKey === selectedCategory;
      return matchQ && matchCat;
    });
  }, [sites, searchQuery, selectedCategory, lang]);

  const openDetail = useCallback((site: HeritageSite) => setDetailSiteId(site.id), []);
  const closeDetail = useCallback(() => setDetailSiteId(null), []);

  const tabs: Array<{ id: ActiveTab; icon: string; label: string }> = [
    { id: 'explore', icon: 'fa-compass', label: dict.navExplore },
    { id: 'map', icon: 'fa-map-location-dot', label: tr(lang, { vi: 'Bản đồ', en: 'Map', ko: '지도', ja: '地図', zh: '地图' }) },
    { id: 'favorites', icon: 'fa-heart', label: dict.navFavorites },
    { id: 'settings', icon: 'fa-ticket', label: tr(lang, { vi: 'Vé', en: 'Pass', ko: '이용권', ja: 'チケット', zh: '通票' }) }
  ];

  // Lời chào đầu tiên luôn theo ngôn ngữ hiện tại (đổi ngôn ngữ sau khi mở app vẫn đúng)
  const nowLabel = tr(lang, { vi: 'Bây giờ', en: 'Now', ko: '방금', ja: '今', zh: '刚刚' });
  const shownMessages = chatMessages.map((m) =>
    m.id === 'WELCOME' ? { ...m, text: dict.chatInitialGreeting, timestamp: nowLabel } : m
  );

  const mobileFrame = viewMode === 'mobile';

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      <div
        className={`w-full bg-slate-50 min-h-screen flex flex-col relative transition-all duration-300 ${
          mobileFrame
            ? 'max-w-[460px] my-0 sm:my-6 sm:rounded-[38px] sm:min-h-[860px] sm:border-[8px] sm:border-slate-800 overflow-hidden shadow-2xl'
            : 'max-w-[1440px]'
        }`}
      >
        <Navbar
          lang={lang}
          onChangeLang={setLang}
          viewMode={viewMode}
          onToggleViewMode={() => setViewMode((p) => (p === 'desktop' ? 'mobile' : 'desktop'))}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenChat={() => setIsChatOpen(true)}
          onOpenAppQr={() => setAppQrOpen(true)}
          favoritesCount={favorites.length}
        />

        <main className={`flex-1 ${narration.track ? 'pb-48 lg:pb-36' : 'pb-24 lg:pb-10'}`}>
          {activeTab === 'explore' && (
            <ExploreTab
              lang={lang}
              sites={filteredSites}
              totalSites={sites.length}
              loading={loading}
              offline={offline}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              onOpenDetail={openDetail}
              onOpenQr={setQrSite}
              onOpenMap={() => setActiveTab('map')}
              isDesktop={!mobileFrame}
              previewSec={previewSec}
            />
          )}

          {activeTab === 'map' && (
            <MapTab
              lang={lang}
              onChangeLang={setLang}
              focusedSite={focusedMapSite}
              onOpenDetail={openDetail}
              onGpsSiteChange={handleGpsSiteChange}
            />
          )}

          {activeTab === 'favorites' && (
            <div className="p-4 md:p-6 space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">{dict.favTitle}</h2>
                <p className="text-xs text-slate-500">{dict.favSubtitle}</p>
              </div>
              {favorites.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 text-sm">
                  <i className="fa-regular fa-heart text-3xl mb-2 block"></i>
                  {dict.favEmpty}
                </div>
              ) : (
                <ExploreTab
                  bare
                  lang={lang}
                  sites={sites.filter((s) => favorites.includes(s.id))}
                  loading={loading}
                  searchQuery=""
                  onSearchChange={() => undefined}
                  selectedCategory="All"
                  onCategoryChange={() => undefined}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  onOpenDetail={openDetail}
                  onOpenQr={setQrSite}
                  isDesktop={!mobileFrame}
                  previewSec={previewSec}
                />
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <AccountTab
              lang={lang}
              listenedCount={listenedCount}
              favoritesCount={favorites.length}
              packages={packages}
              onOpenAppQr={() => setAppQrOpen(true)}
              onToast={showToast}
            />
          )}
        </main>

        <AudioPlayerBar hideOnDesktop={activeTab === 'map'} collapsible={activeTab === 'map'} />

        {/* Thanh điều hướng dưới (điện thoại) */}
        <nav
          className={`fixed bottom-0 z-[1050] bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-around pt-1.5 px-1 hl-safe-bottom ${
            mobileFrame ? 'w-full max-w-[460px]' : 'w-full max-w-[1440px] lg:hidden'
          }`}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center gap-1 text-[11px] font-bold flex-1 py-1 rounded-xl transition ${
                activeTab === tab.id ? 'text-sky-600' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <i className={`fa-solid ${tab.icon} text-base`}></i>
              <span className="max-w-full truncate px-0.5">{tab.label}</span>
              {tab.id === 'favorites' && favorites.length > 0 && (
                <span className="absolute top-0 right-[calc(50%-18px)] min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] leading-4">
                  {favorites.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <PoiDetailModal
          site={detailSite}
          lang={lang}
          isFavorite={detailSite ? favorites.includes(detailSite.id) : false}
          onClose={closeDetail}
          onToggleFavorite={handleToggleFavorite}
          onOpenQr={setQrSite}
          previewSec={previewSec}
          minPrice={minPrice}
          onLocateOnMap={(site) => {
            setDetailSiteId(null);
            setFocusedMapSite(site);
            setActiveTab('map');
          }}
        />

        {welcomeSite && (
          <QrWelcome
            site={welcomeSite}
            lang={lang}
            previewSec={previewSec}
            unlocked={entitlement.hasAccess(welcomeSite.id)}
            onPlay={() => {
              narration.playSite(welcomeSite);
              setWelcomeSiteId(null);
            }}
            onClose={() => setWelcomeSiteId(null)}
          />
        )}

        <SiteQrModal site={qrSite} isOpen={!!qrSite} onClose={() => setQrSite(null)} lang={lang} />
        <AppQrModal isOpen={appQrOpen} onClose={() => setAppQrOpen(false)} lang={lang} />

        <ChatbotModal
          isOpen={isChatOpen}
          lang={lang}
          messages={shownMessages}
          onClose={() => setIsChatOpen(false)}
          onSendMessage={(userText) => {
            const now = new Date().toTimeString().slice(0, 5);
            const botReplyText = appController.askAiBot(userText, lang, appendArchitectureLogs);
            setChatMessages((prev) => [
              ...prev,
              { id: `U_${Date.now()}`, sender: 'user', text: userText, timestamp: now },
              { id: `B_${Date.now() + 1}`, sender: 'bot', text: botReplyText, timestamp: now }
            ]);
          }}
        />

        {toast && (
          <div
            key={toast.id}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[3500] px-4 py-2.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 hl-fade-up max-w-[calc(100%-32px)]"
            role="status"
          >
            <i className={`fa-solid ${toast.icon} text-emerald-400`}></i>
            <span className="break-words min-w-0">{toast.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// QR welcome banner (a user gesture is required before audio can start)
// ---------------------------------------------------------------------------
const QrWelcome: React.FC<{
  site: HeritageSite;
  lang: LanguageCode;
  previewSec: number;
  unlocked: boolean;
  onPlay: () => void;
  onClose: () => void;
}> = ({ site, lang, previewSec, unlocked, onPlay, onClose }) => {
  useOverlay(true, onClose);
  const name = siteName(site, lang);
  return (
    <div className="fixed inset-0 z-[1300] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl hl-modal-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="relative h-44">
          <img src={site.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
          <button
            onClick={onClose}
            aria-label={tr(lang, { vi: 'Đóng', en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' })}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 text-slate-700 flex items-center justify-center shadow"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          <div className="absolute left-5 bottom-4 right-5 text-white">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/90">
              <i className="fa-solid fa-qrcode"></i>
              {tr(lang, { vi: 'Đã quét mã QR tại điểm', en: 'Site QR scanned', ko: '현장 QR 코드 스캔 완료', ja: '現地のQRコードを読み取りました', zh: '已扫描景点二维码' })}
            </span>
            <h3 className="mt-2 text-xl font-extrabold leading-tight break-words">
              {trf(
                lang,
                { vi: 'Chào mừng bạn đến {name}', en: 'Welcome to {name}', ko: '{name}에 오신 것을 환영합니다', ja: '{name}へようこそ', zh: '欢迎来到{name}' },
                { name }
              )}
            </h3>
          </div>
        </div>
        <div className="p-5 space-y-4 text-center">
          <p className="text-sm text-slate-600">
            {unlocked
              ? tr(lang, {
                  vi: 'Vé của bạn đã mở khóa toàn bộ bài thuyết minh tại điểm này.',
                  en: 'Your pass unlocks the full narration for this site.',
                  ko: '이용권으로 이 명소의 전체 해설을 들을 수 있어요.',
                  ja: 'お持ちのチケットで、このスポットの解説をすべてお聴きいただけます。',
                  zh: '您的通票已解锁本景点的完整讲解。'
                })
              : trf(
                  lang,
                  {
                    vi: 'Nghe thử miễn phí {s} giây — mua vé để nghe trọn bộ.',
                    en: 'Free {s}-second preview — buy a pass to hear it all.',
                    ko: '{s}초 무료 미리 듣기 — 이용권을 구매하면 전체 해설을 들을 수 있어요.',
                    ja: '{s}秒の無料試聴 — チケットを購入すると解説をすべてお聴きいただけます。',
                    zh: '免费试听 {s} 秒——购买通票即可收听完整讲解。'
                  },
                  { s: previewSec }
                )}
          </p>
          <button
            onClick={onPlay}
            className="w-full py-4 rounded-full bg-gradient-to-r from-sky-600 to-teal-500 text-white font-extrabold text-base flex items-center justify-center gap-3 shadow-lg shadow-sky-600/30 hover:opacity-95 transition active:scale-[.98]"
          >
            <i className="fa-solid fa-circle-play text-2xl"></i>
            {unlocked
              ? tr(lang, { vi: 'Nghe thuyết minh', en: 'Play narration', ko: '해설 듣기', ja: '解説を聴く', zh: '收听讲解' })
              : tr(lang, { vi: 'Nghe thử ngay', en: 'Play preview', ko: '지금 미리 듣기', ja: '今すぐ試聴', zh: '立即试听' })}
          </button>
          <button onClick={onClose} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
            {tr(lang, { vi: 'Xem thông tin trước', en: 'Read the details first', ko: '먼저 정보 보기', ja: '先に詳細を見る', zh: '先查看详情' })}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Account & pass tab
// ---------------------------------------------------------------------------
const AccountTab: React.FC<{
  lang: LanguageCode;
  listenedCount: number;
  favoritesCount: number;
  packages: TicketPackage[];
  onOpenAppQr: () => void;
  onToast: (text: string, icon?: string) => void;
}> = ({ lang, listenedCount, favoritesCount, packages, onOpenAppQr, onToast }) => {
  const dict = uiTranslations[lang] || uiTranslations.en;
  const { ticket, openCheckout, redeemCode, logout } = useEntitlement();
  const { sites } = useSites();
  const now = useNow(15000);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const active = !!ticket && new Date(ticket.expiresAt).getTime() > now;
  const siteNames =
    ticket && ticket.scope === 'site'
      ? ticket.siteIds.map((id) => {
          const s = sites.find((x) => x.id === id);
          return s ? siteName(s, lang) : `#${id}`;
        })
      : [];
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString(lang === 'en' ? 'en-GB' : numberLocale(lang), {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await redeemCode(code.trim());
      if (r.ok) {
        setCode('');
        setMsg({ ok: true, text: r.message || tr(lang, { vi: 'Kích hoạt vé thành công!', en: 'Pass activated!', ko: '이용권이 활성화되었습니다!', ja: 'チケットを有効化しました！', zh: '通票激活成功！' }) });
        onToast(tr(lang, { vi: 'Đã kích hoạt vé thuyết minh', en: 'Audio pass activated', ko: '해설 이용권이 활성화되었습니다', ja: '音声ガイドのチケットを有効化しました', zh: '语音讲解通票已激活' }), 'fa-crown');
      } else {
        setMsg({ ok: false, text: r.message || tr(lang, { vi: 'Mã không hợp lệ.', en: 'Invalid code.', ko: '유효하지 않은 코드입니다.', ja: '無効なコードです。', zh: '激活码无效。' }) });
      }
    } catch {
      setMsg({ ok: false, text: tr(lang, { vi: 'Không kết nối được máy chủ.', en: 'Could not reach the server.', ko: '서버에 연결할 수 없습니다.', ja: 'サーバーに接続できません。', zh: '无法连接服务器。' }) });
    } finally {
      setBusy(false);
    }
  };

  const activePackages = packages.filter((p) => p.isActive !== false);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="lg:col-span-3 space-y-5">
        {/* Ticket card */}
        <section
          className={`rounded-3xl p-6 shadow-sm border relative overflow-hidden ${
            active
              ? 'bg-gradient-to-br from-sky-600 to-teal-500 text-white border-transparent'
              : 'bg-white border-slate-200'
          }`}
        >
          {active && ticket ? (
            <div className="space-y-4 relative z-10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-sky-100">
                    {tr(lang, { vi: 'Vé thuyết minh điện tử', en: 'Audio e-pass', ko: '오디오 전자 이용권', ja: '音声ガイド電子チケット', zh: '语音讲解电子通票' })}
                  </div>
                  <h2 className="text-xl font-extrabold mt-1 break-words">{ticket.packageName}</h2>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold flex items-center gap-1.5">
                  <i className="fa-solid fa-crown text-amber-300"></i> VIP
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-white/15 p-3">
                  <div className="text-sky-100">{tr(lang, { vi: 'Còn lại', en: 'Remaining', ko: '남은 시간', ja: '残り時間', zh: '剩余时间' })}</div>
                  <div className="text-lg font-extrabold">{formatRemaining(ticket.expiresAt, lang, now)}</div>
                </div>
                <div className="rounded-2xl bg-white/15 p-3">
                  <div className="text-sky-100">{tr(lang, { vi: 'Hết hạn lúc', en: 'Expires', ko: '만료 시각', ja: '有効期限', zh: '到期时间' })}</div>
                  <div className="text-sm font-bold">{fmtDate(ticket.expiresAt)}</div>
                </div>
                <div className="rounded-2xl bg-white/15 p-3 col-span-2">
                  <div className="text-sky-100">{tr(lang, { vi: 'Phạm vi', en: 'Scope', ko: '이용 범위', ja: '対象範囲', zh: '适用范围' })}</div>
                  <div className="text-sm font-bold">
                    {ticket.scope === 'all'
                      ? trf(
                          lang,
                          { vi: 'Tất cả {n} điểm tham quan', en: 'All {n} sites', ko: '전체 명소 {n}곳', ja: '全{n}スポット', zh: '全部 {n} 个景点' },
                          { n: sites.length }
                        )
                      : siteNames.join(lang === 'ja' || lang === 'zh' ? '、' : ', ')}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-sky-100">
                <span className="font-mono">
                  {ticket.orderId
                    ? `${tr(lang, { vi: 'Đơn', en: 'Order', ko: '주문', ja: '注文', zh: '订单' })} ${ticket.orderId}`
                    : ticket.code
                    ? `${tr(lang, { vi: 'Mã', en: 'Code', ko: '코드', ja: 'コード', zh: '激活码' })} ${ticket.code}`
                    : ''}{' '}
                  ·{' '}
                  {ticket.token.slice(0, 8).toUpperCase()}…
                </span>
                <span>
                  {tr(lang, { vi: 'Kích hoạt', en: 'Issued', ko: '발급', ja: '発行', zh: '激活于' })} {fmtDate(ticket.issuedAt)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {ticket.scope === 'site' && (
                  <button
                    onClick={() => openCheckout({ reason: 'manual' })}
                    className="px-4 py-2.5 rounded-full bg-white text-sky-700 text-xs font-extrabold hover:bg-sky-50 transition"
                  >
                    <i className="fa-solid fa-arrow-up mr-1.5"></i>
                    {tr(lang, { vi: 'Nâng cấp vé tất cả điểm', en: 'Upgrade to all sites', ko: '전체 명소 이용권으로 업그레이드', ja: '全スポット券にアップグレード', zh: '升级为全景点通票' })}
                  </button>
                )}
                {confirmLogout ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{tr(lang, { vi: 'Gỡ vé khỏi máy này?', en: 'Remove pass from this device?', ko: '이 기기에서 이용권을 삭제할까요?', ja: 'この端末からチケットを削除しますか？', zh: '要从此设备移除通票吗？' })}</span>
                    <button
                      onClick={() => {
                        logout();
                        setConfirmLogout(false);
                      }}
                      className="px-3 py-2 rounded-full bg-rose-500 text-white text-xs font-bold"
                    >
                      {tr(lang, { vi: 'Gỡ vé', en: 'Remove', ko: '삭제', ja: '削除', zh: '移除' })}
                    </button>
                    <button onClick={() => setConfirmLogout(false)} className="px-3 py-2 rounded-full bg-white/20 text-xs font-bold">
                      {tr(lang, { vi: 'Hủy', en: 'Cancel', ko: '취소', ja: 'キャンセル', zh: '取消' })}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmLogout(true)}
                    className="px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition"
                  >
                    <i className="fa-solid fa-right-from-bracket mr-1.5"></i>
                    {tr(lang, { vi: 'Gỡ vé khỏi thiết bị', en: 'Remove pass', ko: '기기에서 이용권 삭제', ja: '端末からチケットを削除', zh: '从设备移除通票' })}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-xl shrink-0">
                  <i className="fa-solid fa-ticket"></i>
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    {tr(lang, { vi: 'Bạn chưa có vé thuyết minh', en: 'You don\'t have an audio pass yet', ko: '아직 해설 이용권이 없어요', ja: '音声ガイドのチケットはまだありません', zh: '您还没有语音讲解通票' })}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {tr(lang, {
                      vi: 'Mỗi điểm được nghe thử miễn phí. Mua vé điện tử để nghe trọn bản thuyết minh 3–4 phút và tất cả các điểm nhấn.',
                      en: 'Every site has a free preview. Buy an e-pass to hear the full 3–4 minute narration and all highlights.',
                      ko: '모든 명소에서 무료로 미리 들을 수 있어요. 전자 이용권을 구매하면 3~4분 분량의 전체 해설과 모든 볼거리 해설을 들을 수 있습니다.',
                      ja: 'どのスポットも無料で試聴できます。電子チケットを購入すると、3〜4分の解説全編とすべての見どころ解説をお聴きいただけます。',
                      zh: '每个景点均可免费试听。购买电子通票即可收听 3–4 分钟的完整讲解及所有看点介绍。'
                    })}
                  </p>
                </div>
              </div>

              {activePackages.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {activePackages.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openCheckout({ reason: 'manual' })}
                      className="text-left rounded-2xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 p-3 transition relative"
                    >
                      {pkgBadge(p, lang) && (
                        <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-amber-400 text-[10px] font-extrabold text-slate-900 whitespace-nowrap">
                          {pkgBadge(p, lang)}
                        </span>
                      )}
                      <div className="text-xs font-bold text-slate-800 break-words">{pkgName(p, lang)}</div>
                      <div className="text-base font-extrabold text-sky-700 mt-1">{formatVnd(p.price)}</div>
                      <div className="text-[11px] text-slate-500">
                        {trf(lang, { vi: '{h} giờ', en: '{h} hours', ko: '{h}시간', ja: '{h}時間', zh: '{h}小时' }, { h: p.durationHours })}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => openCheckout({ reason: 'manual' })}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-sky-600 to-teal-500 hover:opacity-95 text-white font-extrabold text-sm shadow-md shadow-sky-600/25 transition"
              >
                <i className="fa-solid fa-cart-shopping mr-2"></i>
                {tr(lang, { vi: 'Mua vé', en: 'Buy a pass', ko: '이용권 구매', ja: 'チケットを購入', zh: '购买通票' })}
              </button>

              <form onSubmit={submitCode} className="space-y-2">
                <label className="text-xs font-bold text-slate-700" htmlFor="hl-code">
                  {tr(lang, { vi: 'Nhập mã kích hoạt', en: 'Enter activation code', ko: '활성화 코드 입력', ja: '有効化コードを入力', zh: '输入激活码' })}
                </label>
                <div className="flex gap-2">
                  <input
                    id="hl-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder={tr(lang, { vi: 'VÍ DỤ: HALONG', en: 'E.G. HALONG', ko: '예: HALONG', ja: '例：HALONG', zh: '例如：HALONG' })}
                    className="flex-1 min-w-0 px-4 py-3 rounded-full border border-slate-200 bg-slate-50 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-sky-500"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    disabled={busy || !code.trim()}
                    className="px-5 shrink-0 whitespace-nowrap rounded-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition"
                  >
                    {busy ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      tr(lang, { vi: 'Kích hoạt', en: 'Activate', ko: '활성화', ja: '有効化', zh: '激活' })
                    )}
                  </button>
                </div>
                {msg && (
                  <p className={`text-xs font-semibold ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
                    <i className={`fa-solid ${msg.ok ? 'fa-circle-check' : 'fa-circle-exclamation'} mr-1`}></i>
                    {msg.text}
                  </p>
                )}
              </form>
            </div>
          )}
        </section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { icon: 'fa-headphones', value: listenedCount, label: tr(lang, { vi: 'Lượt đã nghe', en: 'Listens', ko: '청취 횟수', ja: '再生回数', zh: '收听次数' }) },
            { icon: 'fa-heart', value: favoritesCount, label: tr(lang, { vi: 'Yêu thích', en: 'Favourites', ko: '즐겨찾기', ja: 'お気に入り', zh: '收藏' }) },
            { icon: 'fa-language', value: languageMeta(lang).short, label: tr(lang, { vi: 'Ngôn ngữ', en: 'Language', ko: '언어', ja: '言語', zh: '语言' }) }
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
              <i className={`fa-solid ${s.icon} text-sky-600`}></i>
              <div className="text-xl font-extrabold text-slate-900 mt-1">{s.value}</div>
              <div className="text-[11px] text-slate-500 break-words">{s.label}</div>
            </div>
          ))}
        </section>
      </div>

      <div className="lg:col-span-2 space-y-5">
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center text-xl">
            <i className="fa-solid fa-mobile-screen-button"></i>
          </div>
          <h3 className="text-base font-extrabold text-slate-900">{tr(lang, { vi: 'Mở app trên điện thoại', en: 'Open the app on your phone', ko: '휴대폰에서 앱 열기', ja: 'スマホでアプリを開く', zh: '在手机上打开应用' })}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {tr(lang, {
              vi: 'Quét mã QR bằng camera điện thoại để mở Hạ Long SmartGuide, rồi thêm vào màn hình chính như một ứng dụng.',
              en: 'Scan the QR code with your phone camera to open Ha Long SmartGuide, then add it to your home screen.',
              ko: '휴대폰 카메라로 QR 코드를 스캔해 하롱 SmartGuide를 열고, 홈 화면에 추가하면 앱처럼 사용할 수 있어요.',
              ja: 'スマホのカメラでQRコードを読み取ってハロン SmartGuideを開き、ホーム画面に追加するとアプリのように使えます。',
              zh: '用手机相机扫描二维码打开下龙湾 SmartGuide，再添加到主屏幕，即可像应用一样使用。'
            })}
          </p>
          <button
            onClick={onOpenAppQr}
            className="w-full py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
          >
            <i className="fa-solid fa-qrcode mr-2"></i>
            {tr(lang, { vi: 'Hiện mã QR', en: 'Show QR code', ko: 'QR 코드 보기', ja: 'QRコードを表示', zh: '显示二维码' })}
          </button>
        </section>

        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-base font-extrabold text-slate-900">{tr(lang, { vi: 'Về ứng dụng', en: 'About', ko: '앱 소개', ja: 'アプリについて', zh: '关于应用' })}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">{dict.aboutDesc}</p>
          <ul className="text-xs text-slate-600 space-y-1.5">
            <li>
              <i className="fa-solid fa-qrcode text-sky-600 w-5"></i>
              {tr(lang, { vi: 'Quét QR tại điểm → nghe thử → mua vé → nghe trọn bộ', en: 'Scan site QR → preview → buy → full narration', ko: '현장 QR 스캔 → 미리 듣기 → 이용권 구매 → 전체 해설', ja: '現地QRを読み取り → 試聴 → チケット購入 → 全編を聴く', zh: '扫描景点二维码 → 试听 → 购买 → 收听完整讲解' })}
            </li>
            <li>
              <i className="fa-solid fa-satellite-dish text-sky-600 w-5"></i>
              {tr(lang, { vi: 'GPS tự nhận diện khi tàu vào vùng điểm tham quan', en: 'GPS detects when your boat enters a site zone', ko: '배가 명소 구역에 들어서면 GPS가 자동으로 감지해요', ja: '船がスポットのエリアに入るとGPSが自動で検知します', zh: '游船进入景点区域时 GPS 自动识别' })}
            </li>
            <li>
              <i className="fa-solid fa-shield-halved text-sky-600 w-5"></i>
              {tr(lang, { vi: 'Thanh toán VietQR, ví điện tử, thẻ', en: 'VietQR, e-wallet and card payments', ko: 'VietQR, 전자지갑, 카드 결제', ja: 'VietQR・電子ウォレット・カード決済', zh: '支持 VietQR、电子钱包和银行卡支付' })}
            </li>
          </ul>
          <a href="/admin" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700">
            <i className="fa-solid fa-lock text-[10px]"></i>
            {tr(lang, { vi: 'Cổng quản trị', en: 'Admin portal', ko: '관리자 포털', ja: '管理者ポータル', zh: '管理后台' })}
          </a>
        </section>
      </div>
    </div>
  );
};

export default App;
