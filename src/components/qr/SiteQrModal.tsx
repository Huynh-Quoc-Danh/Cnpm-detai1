// Cửa sổ mã QR của một địa điểm: thẻ standee in được, tải PNG, sao chép liên kết.
import React, { useEffect, useState } from 'react';
import { useOverlay } from '../../hooks/useOverlay';
import type { HeritageSite, LanguageCode } from '../../types';
import { copyText, downloadDataUrl, siteQrUrl, useBaseUrl } from '../../services/qr';
import { generateQrDataUrl } from './QrCode';
import { siteName, tr } from '../../i18n';
import { PrintOnly, SiteQrCard } from './QrPrintSheet';

export interface SiteQrModalProps {
  site: HeritageSite | null;
  isOpen: boolean;
  onClose: () => void;
  lang: LanguageCode;
}

const TXT_VI = {
  title: 'Mã QR địa điểm',
  desc: 'In và đặt mã tại điểm tham quan. Du khách quét để mở thuyết minh của đúng địa điểm này.',
  png: 'Tải ảnh PNG',
  print: 'In',
  copy: 'Sao chép liên kết',
  copied: 'Đã sao chép!',
  close: 'Đóng',
  address: 'Địa chỉ dùng cho mã QR',
  kinds: { config: 'Công khai (ngrok)', lan: 'Mạng LAN', origin: 'Trang hiện tại' }
};

type SiteQrTexts = typeof TXT_VI;

const TXT_EN: SiteQrTexts = {
  title: 'Site QR code',
  desc: 'Print and place this code at the attraction. Visitors scan it to open this site’s narration.',
  png: 'Download PNG',
  print: 'Print',
  copy: 'Copy link',
  copied: 'Copied!',
  close: 'Close',
  address: 'Address used in the QR code',
  kinds: { config: 'Public (ngrok)', lan: 'LAN', origin: 'Current page' }
};

const TXT_KO: SiteQrTexts = {
  title: '관광지 QR 코드',
  desc: '이 코드를 인쇄해 관광지에 비치하세요. 방문객이 스캔하면 이 관광지의 해설이 바로 열려요.',
  png: 'PNG 다운로드',
  print: '인쇄',
  copy: '링크 복사',
  copied: '복사했어요!',
  close: '닫기',
  address: 'QR 코드에 사용할 주소',
  kinds: { config: '공개 주소 (ngrok)', lan: 'LAN', origin: '현재 페이지' }
};

const TXT_JA: SiteQrTexts = {
  title: 'スポットのQRコード',
  desc: 'このコードを印刷して観光スポットに設置してください。来訪者が読み取ると、このスポットの音声ガイドが開きます。',
  png: 'PNGを保存',
  print: '印刷',
  copy: 'リンクをコピー',
  copied: 'コピーしました！',
  close: '閉じる',
  address: 'QRコードに使うアドレス',
  kinds: { config: '公開（ngrok）', lan: 'LAN', origin: '現在のページ' }
};

const TXT_ZH: SiteQrTexts = {
  title: '景点二维码',
  desc: '打印此二维码并放置在景点。游客扫码即可打开该景点的讲解。',
  png: '下载 PNG',
  print: '打印',
  copy: '复制链接',
  copied: '已复制！',
  close: '关闭',
  address: '二维码使用的地址',
  kinds: { config: '公网（ngrok）', lan: '局域网', origin: '当前页面' }
};

const TXT: Record<LanguageCode, SiteQrTexts> = { vi: TXT_VI, en: TXT_EN, ko: TXT_KO, ja: TXT_JA, zh: TXT_ZH };

/** Cảnh báo + chọn địa chỉ gốc cho QR (dùng chung cho các cửa sổ QR). */
export const BaseUrlPicker: React.FC<{ lang: LanguageCode; state: ReturnType<typeof useBaseUrl> }> = ({ lang, state }) => {
  const t = TXT[lang] || TXT.vi;
  const { baseUrl, options, setBaseUrl, isLocal, kind, info } = state;
  const lanAvailable = !!info && info.lanUrls.length > 0;
  return (
    <div className="space-y-2">
      {options.length > 1 && (
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t.address}</span>
          <select
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {options.map((o) => (
              <option key={o.url} value={o.url}>
                {o.url} — {t.kinds[o.kind]}
              </option>
            ))}
          </select>
        </label>
      )}
      {isLocal && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] text-rose-700 leading-relaxed">
          <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
          {tr(lang, {
            vi: 'Mã đang trỏ tới localhost – điện thoại sẽ không mở được.',
            en: 'This code points to localhost – phones cannot open it.',
            ko: '이 코드는 localhost를 가리키고 있어 휴대폰에서 열 수 없어요.',
            ja: 'このコードは localhost を指しているため、スマートフォンでは開けません。',
            zh: '此二维码指向 localhost，手机无法打开。'
          })}{' '}
          {lanAvailable
            ? tr(lang, {
                vi: 'Hãy chọn địa chỉ mạng LAN ở trên hoặc chạy ngrok rồi nhập URL công khai trong Quản trị → Cài đặt.',
                en: 'Pick a LAN address above or run ngrok and set the public URL in Admin → Settings.',
                ko: '위에서 LAN 주소를 선택하거나 ngrok을 실행한 뒤 관리 → 설정에서 공개 URL을 입력하세요.',
                ja: '上で LAN アドレスを選ぶか、ngrok を起動して 管理 → 設定 で公開URLを入力してください。',
                zh: '请在上方选择局域网地址，或运行 ngrok 并在 管理 → 设置 中填写公网 URL。'
              })
            : tr(lang, {
                vi: 'Hãy kết nối Wi-Fi hoặc chạy ngrok rồi nhập URL công khai trong Quản trị → Cài đặt.',
                en: 'Connect to Wi-Fi or run ngrok and set the public URL in Admin → Settings.',
                ko: 'Wi-Fi에 연결하거나 ngrok을 실행한 뒤 관리 → 설정에서 공개 URL을 입력하세요.',
                ja: 'Wi-Fi に接続するか、ngrok を起動して 管理 → 設定 で公開URLを入力してください。',
                zh: '请连接 Wi-Fi，或运行 ngrok 并在 管理 → 设置 中填写公网 URL。'
              })}
        </div>
      )}
      {!isLocal && kind === 'lan' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-800 leading-relaxed">
          <i className="fa-solid fa-wifi mr-1.5"></i>
          {tr(lang, {
            vi: 'Đang dùng địa chỉ mạng nội bộ: điện thoại phải kết nối cùng Wi-Fi với máy tính. Khi trình diễn từ xa, hãy dùng ngrok.',
            en: 'Using a local network address: the phone must be on the same Wi-Fi as this computer. For remote demos use ngrok.',
            ko: '내부 네트워크 주소를 사용 중이에요. 휴대폰이 이 컴퓨터와 같은 Wi-Fi에 연결되어 있어야 해요. 원격 시연에는 ngrok을 사용하세요.',
            ja: 'ローカルネットワークのアドレスを使用中です。スマートフォンをこのパソコンと同じ Wi-Fi に接続してください。遠隔でのデモには ngrok を使ってください。',
            zh: '正在使用局域网地址：手机必须与这台电脑连接同一 Wi-Fi。远程演示请使用 ngrok。'
          })}
        </div>
      )}
    </div>
  );
};

export const SiteQrModal: React.FC<SiteQrModalProps> = ({ site, isOpen, onClose, lang }) => {
  const t = TXT[lang] || TXT.vi;
  const base = useBaseUrl(isOpen);
  const [copied, setCopied] = useState(false);
  const url = site ? siteQrUrl(base.baseUrl, site.id) : '';

  useOverlay(isOpen, onClose);

  useEffect(() => {
    if (!copied) return;
    const tm = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(tm);
  }, [copied]);

  if (!isOpen || !site) return null;

  const downloadPng = async () => {
    const data = await generateQrDataUrl(url, { width: 1024, margin: 2 });
    downloadDataUrl(data, `qr-${site.slug || 'site-' + site.id}.png`);
  };

  return (
    <div
      className="fixed inset-0 z-[3000] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full sm:max-w-3xl max-h-[94vh] overflow-y-auto bg-slate-50 rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center gap-3 bg-white/95 backdrop-blur border-b border-slate-200 px-5 py-3.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 text-white flex items-center justify-center">
            <i className="fa-solid fa-qrcode"></i>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-slate-900 leading-tight">{t.title}</p>
            <p className="text-[12px] text-slate-500 truncate">{siteName(site, lang)}</p>
          </div>
          <button
            onClick={onClose}
            aria-label={t.close}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="p-5 grid md:grid-cols-[auto_1fr] gap-6 items-start">
          <div className="flex justify-center">
            <SiteQrCard site={site} url={url} lang={lang} />
          </div>
          <div className="space-y-4">
            <p className="text-[13px] text-slate-600 leading-relaxed">{t.desc}</p>
            <BaseUrlPicker lang={lang} state={base} />
            <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5 font-mono text-[12px] text-slate-600 break-all">
              {url}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => void downloadPng()}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-[13px] font-bold shadow-sm"
              >
                <i className="fa-solid fa-download"></i>
                {t.png}
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-bold shadow-sm"
              >
                <i className="fa-solid fa-print"></i>
                {t.print}
              </button>
              <button
                onClick={async () => setCopied(await copyText(url))}
                className={`col-span-2 inline-flex items-center justify-center gap-2 py-2.5 rounded-full border text-[13px] font-bold transition ${
                  copied ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <i className={`fa-solid ${copied ? 'fa-check' : 'fa-link'}`}></i>
                {copied ? t.copied : t.copy}
              </button>
            </div>
          </div>
        </div>
      </div>

      <PrintOnly>
        <div className="flex justify-center pt-6">
          <div style={{ width: 340 }}>
            <SiteQrCard site={site} url={url} lang={lang} />
          </div>
        </div>
      </PrintOnly>
    </div>
  );
};

export default SiteQrModal;
