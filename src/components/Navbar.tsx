// Thanh điều hướng chính: logo, tab, ngôn ngữ, QR mở app, trạng thái vé, trợ lý AI, liên kết quản trị.
import React, { useEffect, useState } from 'react';
import { LanguageCode, ViewMode, ActiveTab } from '../types';
import { uiTranslations } from '../data/mockData';
import { useEntitlement } from '../context/EntitlementContext';
import { usePreviewSeconds } from '../hooks/usePreviewSeconds';
import { LANGUAGES, tr, trf } from '../i18n';
import { LanguageDropdown } from '../i18n/LanguageDropdown';

interface NavbarProps {
  lang: LanguageCode;
  onChangeLang: (l: LanguageCode) => void;
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenChat: () => void;
  onOpenAppQr: () => void;
  favoritesCount: number;
}

// Ngôn ngữ / cờ / bộ chọn ngôn ngữ nằm ở src/i18n (giữ export cũ để không gãy import).
export { FlagIcon } from '../i18n/FlagIcon';
export { LanguageDropdown } from '../i18n/LanguageDropdown';
export const LANGUAGE_OPTIONS = LANGUAGES.map((l) => ({ code: l.code, label: l.native, short: l.short }));

/** Đếm ngược tới hạn vé: "23 giờ 14 phút" / "23h 14m". */
export function formatRemaining(expiresAt: string | null | undefined, lang: LanguageCode, now = Date.now()): string {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) {
    return tr(lang, { vi: 'Đã hết hạn', en: 'Expired', ko: '만료됨', ja: '期限切れ', zh: '已过期' });
  }
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = Math.max(1, totalMin % 60);
  if (d > 0) return trf(lang, { vi: '{d} ngày {h} giờ', en: '{d}d {h}h', ko: '{d}일 {h}시간', ja: '{d}日{h}時間', zh: '{d}天{h}小时' }, { d, h });
  if (h > 0) return trf(lang, { vi: '{h} giờ {m} phút', en: '{h}h {m}m', ko: '{h}시간 {m}분', ja: '{h}時間{m}分', zh: '{h}小时{m}分钟' }, { h, m: totalMin % 60 });
  return trf(lang, { vi: '{m} phút', en: '{m}m', ko: '{m}분', ja: '{m}分', zh: '{m}分钟' }, { m });
}

/** Re-render định kỳ để đồng hồ đếm ngược luôn đúng. */
export function useNow(intervalMs = 30000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  onChangeLang,
  viewMode,
  onToggleViewMode,
  activeTab,
  onSelectTab,
  onOpenChat,
  onOpenAppQr,
  favoritesCount
}) => {
  const dict = uiTranslations[lang] || uiTranslations.en;
  const T = {
    map: tr(lang, { vi: 'Bản đồ', en: 'Map', ko: '지도', ja: '地図', zh: '地图' }),
    account: tr(lang, { vi: 'Tài khoản & Vé', en: 'Account & Pass', ko: '계정 및 이용권', ja: 'アカウントとチケット', zh: '账户与通票' }),
    tagline: tr(lang, { vi: 'Thuyết minh tự động đa ngôn ngữ', en: 'Multilingual automated audio guide', ko: '다국어 자동 오디오 가이드', ja: '多言語自動音声ガイド', zh: '多语种自动语音导览' }),
    buy: tr(lang, { vi: 'Mua vé', en: 'Buy pass', ko: '이용권 구매', ja: 'チケット購入', zh: '购买通票' }),
    openPhone: tr(lang, { vi: 'Mở trên điện thoại', en: 'Open on phone', ko: '휴대폰에서 열기', ja: 'スマホで開く', zh: '在手机上打开' }),
    toggleFrame: tr(lang, { vi: 'Chuyển khung nhìn Web / Điện thoại', en: 'Toggle web / phone frame', ko: '웹 / 휴대폰 화면 전환', ja: 'Web／スマホ表示を切り替え', zh: '切换网页 / 手机视图' }),
    adminPortal: tr(lang, { vi: 'Quản trị hệ thống', en: 'Admin portal', ko: '관리자 포털', ja: '管理者ポータル', zh: '管理后台' }),
    admin: tr(lang, { vi: 'Quản trị', en: 'Admin', ko: '관리자', ja: '管理', zh: '管理' })
  };
  const { ticket, openCheckout } = useEntitlement();
  const previewSecs = usePreviewSeconds();
  const now = useNow(30000);
  const active = !!ticket && new Date(ticket.expiresAt).getTime() > now;

  const tabs: Array<{ id: ActiveTab; icon: string; label: string; badge?: number }> = [
    { id: 'explore', icon: 'fa-compass', label: dict.navExplore },
    { id: 'map', icon: 'fa-map-location-dot', label: T.map },
    { id: 'favorites', icon: 'fa-heart', label: dict.navFavorites, badge: favoritesCount },
    { id: 'settings', icon: 'fa-ticket', label: T.account }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Logo */}
        <button
          type="button"
          className="flex items-center gap-2 sm:gap-2.5 min-w-0 text-left"
          onClick={() => onSelectTab('explore')}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-sky-500/25">
            <i className="fa-solid fa-ship text-base sm:text-lg"></i>
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-slate-900 text-[14px] sm:text-[15px] md:text-lg tracking-tight leading-none whitespace-nowrap">
              {dict.appTitle}
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block mt-1 truncate">
              {T.tagline}
            </p>
          </div>
        </button>

        {/* Tab desktop */}
        {viewMode === 'desktop' && (
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
            {tabs.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={item.label}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeTab === item.id ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <i className={`fa-solid ${item.icon}`}></i>
                <span className="hidden xl:inline">{item.label}</span>
                {!!item.badge && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] leading-[18px] text-center">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        )}

        {/* Hành động bên phải */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Trạng thái vé */}
          {active ? (
            <button
              onClick={() => onSelectTab('settings')}
              title={ticket?.packageName}
              className="hidden sm:flex h-9 items-center gap-1.5 px-3 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
            >
              <i className="fa-solid fa-crown text-amber-500"></i>
              <span>VIP</span>
              <span className="font-semibold text-emerald-600 hidden xl:inline">· {formatRemaining(ticket?.expiresAt, lang, now)}</span>
            </button>
          ) : (
            <button
              onClick={() => openCheckout({ reason: 'manual' })}
              className="hidden sm:flex h-9 items-center gap-1.5 px-3.5 whitespace-nowrap rounded-full text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 shadow-md shadow-amber-500/25 transition active:scale-95"
            >
              <i className="fa-solid fa-ticket"></i>
              <span>{T.buy}</span>
            </button>
          )}

          {/* QR mở app trên điện thoại */}
          <button
            onClick={onOpenAppQr}
            title={T.openPhone}
            aria-label={T.openPhone}
            className="h-9 w-9 2xl:w-auto 2xl:px-3 rounded-full border border-slate-200 bg-white hover:bg-sky-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <i className="fa-solid fa-qrcode text-sky-600"></i>
            <span className="hidden 2xl:inline">{T.openPhone}</span>
          </button>

          {/* Trợ lý AI */}
          <button
            onClick={onOpenChat}
            title={dict.btnAskAi}
            aria-label={dict.btnAskAi}
            className="h-9 w-9 md:w-auto md:px-3.5 whitespace-nowrap rounded-full text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:opacity-95 shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            <span className="hidden md:inline">{dict.btnAskAi}</span>
          </button>

          <LanguageDropdown lang={lang} onChange={onChangeLang} />

          {/* Chế độ xem (minh họa mobile app trên màn chiếu) */}
          <button
            onClick={onToggleViewMode}
            title={T.toggleFrame}
            aria-label={T.toggleFrame}
            className="hidden lg:flex h-9 w-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 items-center justify-center shadow-sm transition"
          >
            <i className={`fa-solid ${viewMode === 'desktop' ? 'fa-mobile-screen-button' : 'fa-desktop'}`}></i>
          </button>

          <a
            href="/admin"
            title={T.adminPortal}
            className="hidden xl:flex h-9 px-2 rounded-full text-[11px] whitespace-nowrap font-semibold text-slate-400 hover:text-slate-700 items-center gap-1 transition"
          >
            <i className="fa-solid fa-lock text-[10px]"></i>
            <span>{T.admin}</span>
          </a>
        </div>
      </div>

      {/* Dải trạng thái vé trên điện thoại */}
      <div
        className={`sm:hidden px-3 py-1.5 text-[11px] flex items-center justify-between gap-2 border-t ${
          active ? 'bg-emerald-50/90 text-emerald-800 border-emerald-200/60' : 'bg-amber-50/90 text-amber-900 border-amber-200/60'
        }`}
      >
        <div className="flex items-center gap-1.5 font-semibold min-w-0">
          <i className={`fa-solid ${active ? 'fa-crown text-amber-500' : 'fa-headphones text-amber-600'}`}></i>
          <span className="truncate">
            {active
              ? trf(
                  lang,
                  { vi: 'Vé VIP còn {t}', en: 'VIP pass · {t}', ko: 'VIP 이용권 · {t} 남음', ja: 'VIPチケット残り {t}', zh: 'VIP 通票剩余 {t}' },
                  { t: formatRemaining(ticket?.expiresAt, lang, now) }
                )
              : trf(
                  lang,
                  {
                    vi: 'Nghe thử miễn phí {s} giây mỗi điểm',
                    en: 'Free {s}-second preview at every site',
                    ko: '명소마다 {s}초 무료 미리 듣기',
                    ja: '各スポット{s}秒の無料試聴',
                    zh: '每个景点可免费试听 {s} 秒'
                  },
                  { s: previewSecs }
                )}
          </span>
        </div>
        {!active && (
          <button
            onClick={() => openCheckout({ reason: 'manual' })}
            className="shrink-0 px-2.5 py-0.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-sm transition"
          >
            {T.buy}
          </button>
        )}
      </div>
    </header>
  );
};
