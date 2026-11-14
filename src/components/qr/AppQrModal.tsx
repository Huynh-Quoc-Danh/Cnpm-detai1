// Cửa sổ "Mở ứng dụng trên điện thoại": QR dẫn tới ứng dụng + hướng dẫn thêm vào màn hình chính.
import React, { useEffect, useState } from 'react';
import { useOverlay } from '../../hooks/useOverlay';
import type { LanguageCode } from '../../types';
import { appQrUrl, copyText, downloadDataUrl, useBaseUrl } from '../../services/qr';
import { QrCode, generateQrDataUrl } from './QrCode';
import { BaseUrlPicker } from './SiteQrModal';

export interface AppQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: LanguageCode;
}

const TXT_VI = {
  title: 'Mở ứng dụng trên điện thoại',
  desc: 'Dùng camera hoặc Zalo quét mã để mở Hạ Long SmartGuide trên điện thoại – không cần cài đặt từ kho ứng dụng.',
  scan: 'Quét bằng camera điện thoại',
  copy: 'Sao chép',
  copied: 'Đã chép',
  png: 'Tải mã QR',
  install: 'Thêm vào màn hình chính',
  ios: 'iPhone (Safari)',
  iosSteps: ['Mở liên kết bằng Safari', 'Bấm nút Chia sẻ', 'Chọn “Thêm vào MH chính”'],
  android: 'Android (Chrome)',
  androidSteps: ['Mở liên kết bằng Chrome', 'Bấm menu ⋮ ở góc phải', 'Chọn “Thêm vào màn hình chính”'],
  tips: 'Bật định vị (GPS) để thuyết minh tự phát khi bạn đến gần điểm tham quan.',
  close: 'Đóng'
};

type AppQrTexts = typeof TXT_VI;

const TXT_EN: AppQrTexts = {
  title: 'Open the app on your phone',
  desc: 'Scan with your camera to open Ha Long SmartGuide on your phone – no app store install needed.',
  scan: 'Scan with your phone camera',
  copy: 'Copy',
  copied: 'Copied',
  png: 'Download QR',
  install: 'Add to home screen',
  ios: 'iPhone (Safari)',
  iosSteps: ['Open the link in Safari', 'Tap the Share button', 'Choose “Add to Home Screen”'],
  android: 'Android (Chrome)',
  androidSteps: ['Open the link in Chrome', 'Tap the ⋮ menu', 'Choose “Add to Home screen”'],
  tips: 'Turn on location (GPS) so narration plays automatically near each attraction.',
  close: 'Close'
};

const TXT_KO: AppQrTexts = {
  title: '휴대폰에서 앱 열기',
  desc: '카메라나 Zalo로 코드를 스캔하면 휴대폰에서 하롱 SmartGuide가 열려요. 앱 스토어에서 설치할 필요가 없어요.',
  scan: '휴대폰 카메라로 스캔',
  copy: '복사',
  copied: '복사됨',
  png: 'QR 코드 다운로드',
  install: '홈 화면에 추가',
  ios: 'iPhone (Safari)',
  iosSteps: ['Safari로 링크 열기', '공유 버튼 누르기', '“홈 화면에 추가” 선택'],
  android: 'Android (Chrome)',
  androidSteps: ['Chrome으로 링크 열기', '오른쪽 위 ⋮ 메뉴 누르기', '“홈 화면에 추가” 선택'],
  tips: '위치(GPS)를 켜 두면 관광지에 가까워질 때 해설이 자동으로 재생돼요.',
  close: '닫기'
};

const TXT_JA: AppQrTexts = {
  title: 'スマートフォンでアプリを開く',
  desc: 'カメラやZaloでコードを読み取ると、スマートフォンでハロン SmartGuide が開きます。アプリストアからのインストールは不要です。',
  scan: 'スマートフォンのカメラで読み取る',
  copy: 'コピー',
  copied: 'コピー済み',
  png: 'QRコードを保存',
  install: 'ホーム画面に追加',
  ios: 'iPhone（Safari）',
  iosSteps: ['Safariでリンクを開く', '共有ボタンをタップ', '「ホーム画面に追加」を選択'],
  android: 'Android（Chrome）',
  androidSteps: ['Chromeでリンクを開く', '右上の ⋮ メニューをタップ', '「ホーム画面に追加」を選択'],
  tips: '位置情報（GPS）をオンにすると、観光スポットに近づいたときにガイドが自動で再生されます。',
  close: '閉じる'
};

const TXT_ZH: AppQrTexts = {
  title: '在手机上打开应用',
  desc: '用相机或 Zalo 扫码，即可在手机上打开下龙 SmartGuide，无需从应用商店安装。',
  scan: '用手机相机扫码',
  copy: '复制',
  copied: '已复制',
  png: '下载二维码',
  install: '添加到主屏幕',
  ios: 'iPhone（Safari）',
  iosSteps: ['用 Safari 打开链接', '点击“分享”按钮', '选择“添加到主屏幕”'],
  android: 'Android（Chrome）',
  androidSteps: ['用 Chrome 打开链接', '点击右上角 ⋮ 菜单', '选择“添加到主屏幕”'],
  tips: '开启定位（GPS），靠近景点时讲解将自动播放。',
  close: '关闭'
};

const TXT: Record<LanguageCode, AppQrTexts> = { vi: TXT_VI, en: TXT_EN, ko: TXT_KO, ja: TXT_JA, zh: TXT_ZH };

export const AppQrModal: React.FC<AppQrModalProps> = ({ isOpen, onClose, lang }) => {
  const t = TXT[lang] || TXT.vi;
  const base = useBaseUrl(isOpen);
  const [copied, setCopied] = useState(false);
  const url = appQrUrl(base.baseUrl);

  useOverlay(isOpen, onClose);

  useEffect(() => {
    if (!copied) return;
    const tm = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(tm);
  }, [copied]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[3000] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full sm:max-w-2xl max-h-[94vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="relative bg-gradient-to-br from-sky-600 to-teal-500 text-white px-6 pt-6 pb-5 overflow-hidden">
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-white/10"></div>
          <button
            onClick={onClose}
            aria-label={t.close}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          <div className="relative flex items-center gap-3 pr-10">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
              <i className="fa-solid fa-mobile-screen-button text-xl"></i>
            </div>
            <div>
              <h2 className="text-lg font-extrabold leading-tight">{t.title}</h2>
              <p className="text-[12px] text-sky-50/90 mt-0.5 max-w-md">{t.desc}</p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 grid sm:grid-cols-[auto_1fr] gap-6">
          <div className="flex flex-col items-center">
            <div className="relative rounded-[2rem] border-[6px] border-slate-900 bg-white p-4 shadow-xl">
              <span className="absolute top-1.5 left-1/2 -translate-x-1/2 w-14 h-1.5 rounded-full bg-slate-900"></span>
              <QrCode value={url} size={200} logoIcon="fa-water" />
            </div>
            <p className="mt-3 text-[12px] font-bold text-slate-500">
              <i className="fa-solid fa-camera mr-1.5"></i>
              {t.scan}
            </p>
            <button
              onClick={async () => downloadDataUrl(await generateQrDataUrl(url, { width: 1024, margin: 2 }), 'halong-smartguide-app-qr.png')}
              className="mt-2 text-[12px] font-bold text-sky-700 hover:text-sky-800"
            >
              <i className="fa-solid fa-download mr-1"></i>
              {t.png}
            </button>
          </div>

          <div className="space-y-4 min-w-0">
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <span className="flex-1 min-w-0 truncate font-mono text-[12px] text-slate-600">{url}</span>
              <button
                onClick={async () => setCopied(await copyText(url))}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  copied ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                }`}
              >
                <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'} mr-1`}></i>
                {copied ? t.copied : t.copy}
              </button>
            </div>

            <BaseUrlPicker lang={lang} state={base} />

            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                <i className="fa-solid fa-house-chimney mr-1.5"></i>
                {t.install}
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {(
                  [
                    ['fa-apple', t.ios, t.iosSteps],
                    ['fa-android', t.android, t.androidSteps]
                  ] as const
                ).map(([icon, name, steps]) => (
                  <div key={name} className="rounded-2xl border border-slate-200 p-3">
                    <p className="text-[13px] font-extrabold text-slate-800">
                      <i className={`fa-brands ${icon} mr-1.5 text-slate-500`}></i>
                      {name}
                    </p>
                    <ol className="mt-2 space-y-1.5">
                      {steps.map((s, i) => (
                        <li key={s} className="flex items-start gap-2 text-[12px] text-slate-600">
                          <span className="w-4 h-4 mt-px rounded-full bg-sky-100 text-sky-700 text-[9px] font-black flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[12px] text-slate-500 leading-relaxed">
              <i className="fa-solid fa-location-crosshairs text-teal-500 mr-1.5"></i>
              {t.tips}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppQrModal;
