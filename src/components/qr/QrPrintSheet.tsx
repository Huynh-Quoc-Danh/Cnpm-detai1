// Thẻ QR "standee" cho từng địa điểm + bảng in toàn bộ mã QR + vùng chỉ hiển thị khi in.
import React, { useEffect, useState } from 'react';
import { usePreviewSeconds } from '../../hooks/usePreviewSeconds';
import { createPortal } from 'react-dom';
import type { HeritageSite, LanguageCode } from '../../types';
import { siteQrUrl } from '../../services/qr';
import { QrCode } from './QrCode';
import { narrationDuration, siteName, tr } from '../../i18n';

// ---------------- Vùng in ----------------
const PRINT_CSS = `
.hl-print-root { display: none; }
@media print {
  @page { size: A4; margin: 10mm; }
  html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
  body > *:not(.hl-print-root) { display: none !important; }
  .hl-print-root { display: block !important; }
  .hl-print-root * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .hl-print-card { break-inside: avoid; page-break-inside: avoid; box-shadow: none !important; }
}
`;

/** Hiển thị children CHỈ khi in (portal vào <body>, ẩn mọi thứ khác lúc in). */
export const PrintOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = document.createElement('div');
    el.className = 'hl-print-root';
    document.body.appendChild(el);
    setHost(el);
    return () => {
      document.body.removeChild(el);
    };
  }, []);
  if (!host) return null;
  return createPortal(
    <>
      <style>{PRINT_CSS}</style>
      {children}
    </>,
    host
  );
};

// ---------------- Thẻ QR địa điểm ----------------
const ALL_LANGS = 'Tiếng Việt · English · 한국어 · 日本語 · 中文';

interface CardTexts {
  headline: string;
  /** Dòng phụ (ngôn ngữ thứ hai) dưới tiêu đề. */
  sub: string;
  steps: (sec: number) => string[];
  min: (n: number) => string;
}

const VI_HEADLINE = 'Quét để nghe thuyết minh tự động';
const EN_HEADLINE = 'Scan for the audio guide';

const CARD_TXT: Record<LanguageCode, CardTexts> = {
  vi: {
    headline: VI_HEADLINE,
    sub: EN_HEADLINE,
    steps: (s) => ['Quét mã', `Nghe thử ${s} giây`, 'Thanh toán để nghe trọn bài'],
    min: (n) => `${n} phút`
  },
  en: {
    headline: EN_HEADLINE,
    sub: VI_HEADLINE,
    steps: (s) => ['Scan the code', `${s}-second free preview`, 'Pay to hear the full story'],
    min: (n) => `${n} min`
  },
  ko: {
    headline: '스캔하고 오디오 가이드를 들어 보세요',
    sub: VI_HEADLINE,
    steps: (s) => ['코드 스캔', `${s}초 무료 미리 듣기`, '결제하고 전체 해설 듣기'],
    min: (n) => `${n}분`
  },
  ja: {
    headline: '読み取って音声ガイドを聴く',
    sub: VI_HEADLINE,
    steps: (s) => ['コードを読み取る', `${s}秒の無料試聴`, 'お支払いで全編を視聴'],
    min: (n) => `${n}分`
  },
  zh: {
    headline: '扫码收听语音导览',
    sub: VI_HEADLINE,
    steps: (s) => ['扫描二维码', `免费试听 ${s} 秒`, '付款收听完整讲解'],
    min: (n) => `${n} 分钟`
  }
};

export interface SiteQrCardProps {
  site: HeritageSite;
  url: string;
  lang: LanguageCode;
  /** Smaller variant for the print grid. */
  compact?: boolean;
  previewSec?: number;
  onQrReady?: (dataUrl: string) => void;
}

export const SiteQrCard: React.FC<SiteQrCardProps> = ({ site, url, lang, compact = false, previewSec: previewProp, onQrReady }) => {
  const previewSec = usePreviewSeconds(previewProp);
  const t = CARD_TXT[lang] || CARD_TXT.vi;
  const steps = t.steps(previewSec);
  const title = siteName(site, lang);
  // Dòng phụ: tên tiếng Việt (hoặc tiếng Anh khi đang xem tiếng Việt)
  const alt = lang === 'vi' ? siteName(site, 'en') : siteName(site, 'vi');
  const minutes = Math.max(1, Math.round((narrationDuration(site, lang) || 210) / 60));
  const qrSize = compact ? 150 : 196;
  return (
    <div
      className={`hl-print-card bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col ${
        compact ? 'w-full' : 'w-full max-w-[340px]'
      }`}
    >
      <div className={`relative ${compact ? 'h-24' : 'h-32'} bg-slate-200`}>
        <img
          src={site.image}
          alt=""
          onError={(e) => {
            if (site.fallbackImage && e.currentTarget.src !== site.fallbackImage) e.currentTarget.src = site.fallbackImage;
          }}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/30 to-transparent"></div>
        <div className="absolute top-2.5 left-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-0.5">
          <span className="w-4 h-4 rounded-full bg-gradient-to-br from-sky-600 to-teal-500 text-white flex items-center justify-center">
            <i className="fa-solid fa-water text-[7px]"></i>
          </span>
          <span className="text-[9px] font-extrabold text-slate-800 tracking-wide">HẠ LONG SMARTGUIDE</span>
        </div>
        <div className="absolute bottom-2 left-3 right-3 text-white">
          <p className={`${compact ? 'text-[13px]' : 'text-base'} font-black leading-tight drop-shadow line-clamp-2 break-words`}>{title}</p>
          <p className="text-[10px] text-white/80 truncate">{alt}</p>
        </div>
      </div>

      <div className={`flex-1 flex flex-col items-center ${compact ? 'px-3 pt-3 pb-3' : 'px-5 pt-4 pb-4'}`}>
        <p className={`${compact ? 'text-[12px]' : 'text-[15px]'} font-black text-slate-900 text-center leading-tight`}>
          <i className="fa-solid fa-headphones text-sky-600 mr-1.5"></i>
          {t.headline}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5 text-center">{t.sub}</p>

        <div className="relative mt-3 p-2.5">
          {/* Khung góc kiểu máy quét */}
          {['top-0 left-0 border-t-4 border-l-4 rounded-tl-xl', 'top-0 right-0 border-t-4 border-r-4 rounded-tr-xl', 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl', 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl'].map(
            (c) => (
              <span key={c} className={`absolute w-6 h-6 border-sky-600 ${c}`}></span>
            )
          )}
          <QrCode value={url} size={qrSize} onReady={onQrReady} alt={`QR ${title}`} />
        </div>

        <ol className={`mt-3 w-full grid grid-cols-3 gap-1.5 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
          {steps.map((s, i) => (
            <li key={s} className="flex flex-col items-center text-center gap-1">
              <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[10px] font-black flex items-center justify-center">
                {i + 1}
              </span>
              <span className="font-semibold text-slate-600 leading-tight break-words">{s}</span>
            </li>
          ))}
        </ol>

        <div className="mt-3 w-full flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[9px] text-slate-500">
          <span className="font-semibold">
            <i className="fa-solid fa-language mr-1 text-teal-500"></i>
            {ALL_LANGS}
          </span>
          <span className="font-semibold">
            <i className="fa-regular fa-clock mr-1 text-teal-500"></i>
            {t.min(minutes)}
          </span>
        </div>
        <p className="mt-1.5 w-full text-center font-mono text-[8.5px] text-slate-400 break-all leading-snug">{url}</p>
      </div>
      <div className="h-1.5 bg-gradient-to-r from-sky-600 to-teal-500"></div>
    </div>
  );
};

// ---------------- Bảng in toàn bộ ----------------
export interface QrPrintSheetProps {
  sites: HeritageSite[];
  baseUrl: string;
  lang: LanguageCode;
  previewSec?: number;
  /** Also register a print-only copy (window.print() prints just the sheet). Default true. */
  printable?: boolean;
  className?: string;
}

export const QrPrintSheet: React.FC<QrPrintSheetProps> = ({
  sites,
  baseUrl,
  lang,
  previewSec = 30,
  printable = true,
  className = ''
}) => {
  const list = sites.filter((s) => s.isActive !== false);
  const grid = (cols: string) => (
    <div className={`grid ${cols} gap-4`}>
      {list.map((s) => (
        <SiteQrCard key={s.id} site={s} url={siteQrUrl(baseUrl, s.id)} lang={lang} compact previewSec={previewSec} />
      ))}
    </div>
  );
  return (
    <>
      <div className={className}>{grid('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4')}</div>
      {printable && (
        <PrintOnly>
          <div className="p-0">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-2">
              <p className="font-black text-slate-900">
                Hạ Long SmartGuide ·{' '}
                {tr(lang, {
                  vi: 'Bộ mã QR thuyết minh',
                  en: 'Audio guide QR set',
                  ko: '오디오 가이드 QR 세트',
                  ja: '音声ガイドQRセット',
                  zh: '语音导览二维码合集'
                })}
              </p>
              <p className="text-[10px] font-mono text-slate-500">{baseUrl}</p>
            </div>
            {grid('grid-cols-3')}
          </div>
        </PrintOnly>
      )}
    </>
  );
};

export default QrPrintSheet;
