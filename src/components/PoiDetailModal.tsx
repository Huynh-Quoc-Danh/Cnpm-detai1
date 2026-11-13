// Chi tiết điểm tham quan: ảnh bìa, trình phát thuyết minh, điểm nhấn (exhibits), lịch sử, địa chất, QR.
import React from 'react';
import { useOverlay } from '../hooks/useOverlay';
import { HeritageSite, LanguageCode } from '../types';
import { uiTranslations } from '../data/mockData';
import { useEntitlement } from '../context/EntitlementContext';
import { useNarration } from '../context/NarrationContext';
import { SeekablePlayer } from './audio/SeekablePlayer';
import { formatTime } from '../services/narrationEngine';
import { formatVnd } from '../services/api';
import {
  exhibitName,
  exhibitShortDesc,
  exhibitZone,
  languageMeta,
  narrationDuration,
  numberLocale,
  siteHighlights,
  siteName,
  siteText,
  tr,
  trf,
  LANGUAGES
} from '../i18n';

interface PoiDetailModalProps {
  site: HeritageSite | null;
  lang: LanguageCode;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: (id: number) => void;
  onLocateOnMap: (site: HeritageSite) => void;
  onOpenQr: (site: HeritageSite) => void;
  previewSec?: number;
  /** Giá gói rẻ nhất (VND) để hiển thị "từ ...". */
  minPrice?: number | null;
}

export const PoiDetailModal: React.FC<PoiDetailModalProps> = ({
  site,
  lang,
  isFavorite,
  onClose,
  onToggleFavorite,
  onLocateOnMap,
  onOpenQr,
  previewSec = 30,
  minPrice
}) => {
  const { hasAccess, openCheckout } = useEntitlement();
  const { playExhibit, isCurrent, status, toggle } = useNarration();

  useOverlay(!!site, onClose);

  if (!site) return null;

  const dict = uiTranslations[lang];
  const title = siteName(site, lang);
  const province = siteText(site, lang, 'province');
  const category = siteText(site, lang, 'category');
  const year = siteText(site, lang, 'year');
  const history = siteText(site, lang, 'history');
  const geology = siteText(site, lang, 'geology');
  const highlights = siteHighlights(site, lang);
  const shortDesc = siteText(site, lang, 'shortDesc');
  const unlocked = hasAccess(site.id);
  const duration = formatTime(narrationDuration(site, lang));
  // Ngôn ngữ hiện tại đứng đầu, sau đó các ngôn ngữ còn lại (vi, en, ko, ja, zh).
  const langList = [languageMeta(lang), ...LANGUAGES.filter((l) => l.code !== lang)].map((l) => l.native).join(' · ');
  const exhibits = [...(site.exhibits || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div
      className="fixed inset-0 z-[1200] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="bg-white w-full max-w-3xl rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[90vh] hl-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-y-auto flex-1">
          {/* Ảnh bìa */}
          <div className="relative h-60 sm:h-80 w-full bg-slate-900">
            <img
              src={site.image}
              alt={title}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (site.fallbackImage && img.src !== site.fallbackImage) img.src = site.fallbackImage;
              }}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-slate-950/30"></div>

            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <button
                onClick={onClose}
                className="h-9 px-3.5 rounded-full bg-white/90 hover:bg-white text-slate-800 text-xs font-bold flex items-center gap-2 shadow transition"
              >
                <i className="fa-solid fa-arrow-left"></i>
                <span>{dict.btnBack}</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenQr(site)}
                  title={tr(lang, { vi: 'Mã QR điểm này', en: 'Site QR code', ko: '이 명소의 QR 코드', ja: 'このスポットのQRコード', zh: '本景点二维码' })}
                  className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 flex items-center justify-center shadow transition"
                >
                  <i className="fa-solid fa-qrcode"></i>
                </button>
                <button
                  onClick={() => onToggleFavorite(site.id)}
                  aria-label={tr(lang, { vi: 'Yêu thích', en: 'Favourite', ko: '즐겨찾기', ja: 'お気に入り', zh: '收藏' })}
                  className={`w-9 h-9 rounded-full flex items-center justify-center shadow transition ${
                    isFavorite ? 'bg-rose-500 text-white' : 'bg-white/90 text-slate-400 hover:text-rose-500'
                  }`}
                >
                  <i className="fa-solid fa-heart"></i>
                </button>
              </div>
            </div>

            <div className="absolute bottom-4 left-5 right-5 text-white space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-sky-600 shadow">{category}</span>
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/15 backdrop-blur border border-white/20">
                  {year}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400 text-slate-900">
                  <i className="fa-solid fa-star text-[10px] mr-1"></i>
                  {site.rating} · {site.reviewsCount.toLocaleString(numberLocale(lang))}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight break-words">{title}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-200 font-medium">
                <span>
                  <i className="fa-solid fa-location-dot mr-1.5 text-sky-300"></i>
                  {province}
                </span>
                <span>
                  <i className="fa-solid fa-earth-asia mr-1.5 text-sky-300"></i>
                  {site.lat.toFixed(5)}°N, {site.lng.toFixed(5)}°E
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            <p className="text-sm text-slate-600 leading-relaxed">{shortDesc}</p>

            {/* Trình phát thuyết minh */}
            <section className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-teal-50 p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/25">
                    <i className="fa-solid fa-headphones"></i>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {tr(lang, { vi: 'Thuyết minh âm thanh', en: 'Audio narration', ko: '오디오 해설', ja: '音声ガイド', zh: '语音讲解' })}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {tr(lang, { vi: 'Thời lượng đầy đủ', en: 'Full length', ko: '전체 길이', ja: '全編', zh: '完整时长' })}{' '}
                      <strong className="text-slate-700">{duration}</strong> · {langList}
                    </div>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                    unlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <i className={`fa-solid ${unlocked ? 'fa-lock-open' : 'fa-lock'}`}></i>
                  {unlocked
                    ? tr(lang, { vi: 'Đã mở khóa toàn bộ', en: 'Fully unlocked', ko: '전체 잠금 해제됨', ja: 'すべてアンロック済み', zh: '已全部解锁' })
                    : trf(
                        lang,
                        {
                          vi: 'Nghe thử miễn phí {s} giây',
                          en: 'Free {s}-second preview',
                          ko: '{s}초 무료 미리 듣기',
                          ja: '{s}秒間の無料試聴',
                          zh: '免费试听 {s} 秒'
                        },
                        { s: previewSec }
                      )}
                </span>
              </div>

              <SeekablePlayer variant="compact" site={site} lang={lang} />

              {!unlocked && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl bg-white border border-amber-200 p-3">
                  <div className="flex-1 text-xs text-slate-600 leading-relaxed">
                    {trf(
                      lang,
                      {
                        vi: 'Bạn đang nghe bản thử {s} giây. Mua vé điện tử để nghe trọn {d} và toàn bộ {n} điểm nhấn.',
                        en: "You're hearing a {s}-second preview. Buy an e-pass to hear the full {d} and all {n} highlights.",
                        ko: '지금 {s}초 미리 듣기를 듣고 있어요. 전자 이용권을 구매하면 {d} 전체 해설과 하이라이트 {n}곳을 모두 들을 수 있어요.',
                        ja: '現在{s}秒間の試聴をお聴きいただいています。電子チケットを購入すると、{d}の全編と見どころ{n}か所すべてをお聴きいただけます。',
                        zh: '您正在收听 {s} 秒试听。购买电子通票即可收听完整的 {d} 讲解及全部 {n} 个亮点。'
                      },
                      { s: previewSec, d: duration, n: exhibits.length }
                    )}
                  </div>
                  <button
                    onClick={() => openCheckout({ siteId: site.id, reason: 'manual' })}
                    className="shrink-0 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-extrabold shadow-md shadow-amber-500/25 hover:opacity-95 transition"
                  >
                    <i className="fa-solid fa-unlock mr-1.5"></i>
                    {minPrice
                      ? trf(lang, { vi: 'Mở khóa từ {p}', en: 'Unlock from {p}', ko: '{p}부터 잠금 해제', ja: '{p}からアンロック', zh: '{p} 起解锁' }, { p: formatVnd(minPrice) })
                      : tr(lang, { vi: 'Mở khóa toàn bộ', en: 'Unlock all', ko: '전체 잠금 해제', ja: 'すべてアンロック', zh: '全部解锁' })}
                  </button>
                </div>
              )}
            </section>

            {/* Điểm nhấn */}
            {exhibits.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <i className="fa-solid fa-landmark text-sky-600"></i>
                  <span>
                    {tr(lang, { vi: 'Điểm nhấn', en: 'Highlights', ko: '하이라이트', ja: '見どころ', zh: '亮点' })} <span className="text-slate-400 font-semibold">({exhibits.length})</span>
                  </span>
                </h3>
                <div className="space-y-2.5">
                  {exhibits.map((ex) => {
                    const cur = isCurrent(site.id, ex.id);
                    const playing = cur && (status === 'playing' || status === 'loading');
                    return (
                      <div
                        key={ex.id}
                        className={`flex items-center gap-3 p-2.5 rounded-2xl border transition ${
                          cur ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white hover:border-sky-200'
                        }`}
                      >
                        <img
                          src={ex.image || site.image}
                          alt=""
                          loading="lazy"
                          onError={(e) => ((e.target as HTMLImageElement).src = site.image)}
                          className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">{exhibitName(ex, lang)}</div>
                          <div className="text-[11px] font-semibold text-sky-600 truncate">{exhibitZone(ex, lang)}</div>
                          <div className="text-xs text-slate-500 truncate">{exhibitShortDesc(ex, lang)}</div>
                        </div>
                        <button
                          onClick={() => (cur && (status === 'playing' || status === 'paused') ? toggle() : playExhibit(site, ex))}
                          className={`shrink-0 h-9 px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${
                            playing ? 'bg-emerald-600 text-white' : 'bg-sky-600 hover:bg-sky-700 text-white'
                          }`}
                        >
                          <i className={`fa-solid ${playing ? 'fa-pause' : 'fa-volume-high'}`}></i>
                          <span>{playing
                              ? tr(lang, { vi: 'Đang nghe', en: 'Playing', ko: '재생 중', ja: '再生中', zh: '正在收听' })
                              : tr(lang, { vi: 'Nghe', en: 'Listen', ko: '듣기', ja: '聴く', zh: '收听' })}</span>
                          <span className="hidden sm:inline font-medium opacity-80">
                            {formatTime(narrationDuration(ex, lang))}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {history && (
              <section className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <i className="fa-solid fa-scroll text-sky-600"></i>
                  <span>{dict.detailSectionHistory}</span>
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">{history}</p>
              </section>
            )}

            {geology && (
              <section className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <i className="fa-solid fa-mountain text-sky-600"></i>
                  <span>{dict.detailSectionGeology}</span>
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">{geology}</p>
              </section>
            )}

            {highlights.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <i className="fa-solid fa-star text-amber-500"></i>
                  <span>{dict.detailSectionHighlights}</span>
                </h3>
                <ul className="space-y-2">
                  {highlights.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <i className="fa-solid fa-circle-check text-emerald-600 mt-1"></i>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => onLocateOnMap(site)}
                className="py-3.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <i className="fa-solid fa-map-location-dot"></i>
                <span>{tr(lang, { vi: 'Định vị trên bản đồ', en: 'Show on map', ko: '지도에서 보기', ja: '地図で表示', zh: '在地图上查看' })}</span>
              </button>
              <button
                onClick={() => onOpenQr(site)}
                className="py-3.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <i className="fa-solid fa-qrcode text-sky-600"></i>
                <span>{tr(lang, { vi: 'Mã QR điểm này', en: 'Site QR code', ko: '이 명소의 QR 코드', ja: 'このスポットのQRコード', zh: '本景点二维码' })}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
