// Thẻ "Thuyết minh Âm thanh": trạng thái kết nối/GPS, trình phát có thanh tua, trạng thái vé.
import React from 'react';
import type { HeritageSite, LanguageCode } from '../../types';
import type { GeoStatus } from '../../hooks/useGeolocation';
import { useNarration } from '../../context/NarrationContext';
import { useEntitlement } from '../../context/EntitlementContext';
import { SeekablePlayer } from '../audio/SeekablePlayer';
import { PlayingBars } from './ExhibitList';
import { usePreviewSeconds } from '../../hooks/usePreviewSeconds';
import { formatDurationLabel as fmt, narrationDuration, siteName as localSiteName, tr, trf } from '../../i18n';

interface AudioCardProps {
  site: HeritageSite | null;
  lang: LanguageCode;
  sitesCount: number;
  online: boolean;
  gpsStatus: GeoStatus;
  gpsAccuracy: number | null;
  gpsError: string | null;
  simulating: boolean;
  onStartGps: () => void;
  onOpenQr: (site: HeritageSite) => void;
}

export const AudioCard: React.FC<AudioCardProps> = ({
  site,
  lang,
  sitesCount,
  online,
  gpsStatus,
  gpsAccuracy,
  gpsError,
  simulating,
  onStartGps,
  onOpenQr
}) => {
  const { track, status, playSite, previewSec: trackPreview } = useNarration();
  const previewSecs = usePreviewSeconds(trackPreview);
  const { hasAccess, openCheckout } = useEntitlement();

  // Dòng trạng thái hệ thống
  let tone: 'ok' | 'warn' | 'err' | 'info' = 'ok';
  let icon = 'fa-circle-check';
  let msg: React.ReactNode;
  const conn = online
    ? trf(
        lang,
        {
          vi: 'Đã kết nối hệ thống ({n} điểm).',
          en: 'Connected to the system ({n} sites).',
          ko: '시스템에 연결되었어요 (관광지 {n}곳).',
          ja: 'システムに接続しました（{n}か所）。',
          zh: '已连接系统（{n} 个景点）。'
        },
        { n: sitesCount }
      )
    : trf(
        lang,
        {
          vi: 'Ngoại tuyến – dùng dữ liệu lưu sẵn ({n} điểm).',
          en: 'Offline – using cached data ({n} sites).',
          ko: '오프라인 – 저장된 데이터를 사용 중이에요 (관광지 {n}곳).',
          ja: 'オフライン – 保存済みデータを使用中（{n}か所）。',
          zh: '离线 – 正在使用已缓存的数据（{n} 个景点）。'
        },
        { n: sitesCount }
      );
  if (!online) {
    tone = 'warn';
    icon = 'fa-triangle-exclamation';
  }
  if (simulating) {
    msg = (
      <>
        {conn}{' '}
        {tr(lang, {
          vi: 'Đang dùng vị trí mô phỏng.',
          en: 'Using a simulated position.',
          ko: '가상 위치를 사용 중이에요.',
          ja: '仮想位置を使用しています。',
          zh: '正在使用模拟位置。'
        })}
      </>
    );
    if (online) {
      tone = 'info';
      icon = 'fa-ship';
    }
  } else if (gpsStatus === 'watching') {
    msg = (
      <>
        {conn}{' '}
        {tr(lang, {
          vi: 'Đang nhận tín hiệu GPS',
          en: 'Receiving GPS signal',
          ko: 'GPS 신호를 수신 중이에요',
          ja: 'GPS信号を受信中です',
          zh: '正在接收 GPS 信号'
        })}
        {gpsAccuracy !== null && <span className="font-semibold"> (±{Math.round(gpsAccuracy)} m)</span>}
        {tr(lang, { vi: '.', en: '.', ko: '.', ja: '。', zh: '。' })}
      </>
    );
  } else if (gpsStatus === 'prompt') {
    msg = (
      <>
        {conn}{' '}
        {tr(lang, {
          vi: 'Đang chờ quyền truy cập vị trí…',
          en: 'Waiting for location permission…',
          ko: '위치 접근 권한을 기다리는 중이에요…',
          ja: '位置情報の許可を待っています…',
          zh: '正在等待位置权限…'
        })}
      </>
    );
    tone = 'info';
    icon = 'fa-location-crosshairs';
  } else if (gpsStatus === 'denied') {
    tone = 'err';
    icon = 'fa-location-pin-lock';
    msg = tr(lang, {
      vi: 'Bạn đã chặn quyền vị trí. Hãy bật lại trong cài đặt trình duyệt hoặc dùng chế độ Mô phỏng.',
      en: 'Location permission is blocked. Re-enable it in browser settings or use Simulation mode.',
      ko: '위치 권한이 차단되어 있어요. 브라우저 설정에서 다시 허용하거나 시뮬레이션 모드를 사용하세요.',
      ja: '位置情報の許可がブロックされています。ブラウザの設定で再度許可するか、シミュレーションモードをご利用ください。',
      zh: '位置权限已被阻止。请在浏览器设置中重新开启，或使用模拟模式。'
    });
  } else if (gpsStatus === 'insecure') {
    tone = 'warn';
    icon = 'fa-shield-halved';
    msg = tr(lang, {
      vi: 'GPS chỉ hoạt động qua HTTPS. Hãy mở bằng đường link ngrok (https://…) trên điện thoại, hoặc dùng chế độ Mô phỏng.',
      en: 'GPS requires HTTPS. Open the ngrok link (https://…) on your phone, or use Simulation mode.',
      ko: 'GPS는 HTTPS에서만 작동해요. 휴대폰에서 ngrok 링크(https://…)로 열거나 시뮬레이션 모드를 사용하세요.',
      ja: 'GPSはHTTPSでのみ動作します。スマートフォンでngrokのリンク（https://…）を開くか、シミュレーションモードをご利用ください。',
      zh: 'GPS 仅在 HTTPS 下可用。请在手机上打开 ngrok 链接（https://…），或使用模拟模式。'
    });
  } else if (gpsStatus === 'unavailable') {
    tone = 'warn';
    icon = 'fa-satellite-dish';
    msg = tr(lang, {
      vi: 'Thiết bị không hỗ trợ GPS. Bạn có thể dùng chế độ Mô phỏng.',
      en: 'GPS is not supported. Try Simulation mode.',
      ko: '이 기기는 GPS를 지원하지 않아요. 시뮬레이션 모드를 사용해 보세요.',
      ja: 'この端末はGPSに対応していません。シミュレーションモードをお試しください。',
      zh: '该设备不支持 GPS。请尝试模拟模式。'
    });
  } else {
    msg = (
      <>
        {conn}{' '}
        {tr(lang, {
          vi: 'Sẵn sàng nhận tín hiệu GPS.',
          en: 'Ready to receive GPS signal.',
          ko: 'GPS 신호를 받을 준비가 되었어요.',
          ja: 'GPS信号を受信する準備ができました。',
          zh: '已准备好接收 GPS 信号。'
        })}
      </>
    );
  }

  const toneCls = {
    ok: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warn: 'bg-amber-50 text-amber-800 border-amber-200',
    err: 'bg-rose-50 text-rose-800 border-rose-200',
    info: 'bg-sky-50 text-sky-800 border-sky-200'
  }[tone];
  const iconCls = {
    ok: 'text-emerald-500',
    warn: 'text-amber-500',
    err: 'text-rose-500',
    info: 'text-sky-500'
  }[tone];

  const unlocked = site ? hasAccess(site.id) : false;
  const siteName = localSiteName(site, lang);
  const fullDur = narrationDuration(site, lang);
  const trackIsSelectedSite = !!track && !!site && track.siteId === site.id && !track.exhibitId;
  const isActive = (s: string) => s === 'playing' || s === 'paused' || s === 'loading' || s === 'locked' || s === 'ended';

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <header className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-sky-600/30">
          <i className="fa-solid fa-headphones text-sm" />
        </span>
        <h3 className="font-extrabold text-slate-800 text-[15px] min-w-0 truncate">
          {tr(lang, { vi: 'Thuyết minh Âm thanh', en: 'Audio Narration', ko: '오디오 해설', ja: '音声ガイド', zh: '语音讲解' })}
        </h3>
        {status === 'playing' && (
          <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-600">
            <PlayingBars className="text-teal-500" />{' '}
            {tr(lang, { vi: 'Đang phát', en: 'Playing', ko: '재생 중', ja: '再生中', zh: '正在播放' })}
          </span>
        )}
      </header>

      <div className="px-4 space-y-3 pb-4">
        <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-relaxed ${toneCls}`}>
          <i className={`fa-solid ${icon} mt-0.5 ${iconCls}`} />
          <div className="min-w-0 flex-1">
            <p>{msg}</p>
            {gpsError && gpsStatus === 'watching' && <p className="opacity-75 mt-0.5">{gpsError}</p>}
          </div>
          {!simulating && (gpsStatus === 'idle' || gpsStatus === 'denied') && (
            <button
              type="button"
              onClick={onStartGps}
              className="shrink-0 rounded-full bg-white/80 border border-black/10 px-2.5 py-1 text-[11px] font-bold hover:bg-white"
            >
              <i className="fa-solid fa-location-crosshairs mr-1" />
              {gpsStatus === 'denied'
                ? tr(lang, { vi: 'Thử lại', en: 'Retry', ko: '다시 시도', ja: '再試行', zh: '重试' })
                : tr(lang, { vi: 'Bật GPS', en: 'Enable GPS', ko: 'GPS 켜기', ja: 'GPSをオン', zh: '开启 GPS' })}
            </button>
          )}
        </div>

        {/* Trình phát */}
        {track && isActive(status) ? (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
            <div className="flex items-center gap-3 mb-2">
              {track.image && (
                <img src={track.image} alt="" className="w-10 h-10 rounded-lg object-cover ring-1 ring-slate-200 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{track.title}</p>
                {track.subtitle && <p className="text-[11px] text-slate-500 truncate">{track.subtitle}</p>}
              </div>
            </div>
            <SeekablePlayer variant="compact" />
          </div>
        ) : null}

        {site && !(track && isActive(status) && trackIsSelectedSite) && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-2.5 pr-3 hover:border-sky-300 transition-colors">
            <img
              src={site.image}
              alt=""
              onError={(e) => {
                const img = e.currentTarget;
                if (site.fallbackImage && img.src !== site.fallbackImage) img.src = site.fallbackImage;
              }}
              className="w-12 h-12 rounded-xl object-cover shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 truncate">{siteName}</p>
              <p className="text-[11px] text-slate-500">
                <i className="fa-regular fa-clock mr-1" />
                {tr(lang, { vi: 'Bài thuyết minh', en: 'Full narration', ko: '전체 해설', ja: '解説全編', zh: '完整讲解' })} {fmt(fullDur)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => playSite(site, { lang })}
              className="shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-sky-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-sky-600/30 hover:scale-105 active:scale-95 transition-transform"
              aria-label={trf(
                lang,
                {
                  vi: 'Nghe thuyết minh {name}',
                  en: 'Play narration for {name}',
                  ko: '{name} 해설 듣기',
                  ja: '{name}の解説を聞く',
                  zh: '收听{name}的讲解'
                },
                { name: siteName }
              )}
            >
              <i className="fa-solid fa-play ml-0.5" />
            </button>
          </div>
        )}

        {/* Trạng thái vé */}
        {site &&
          (unlocked ? (
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
              <i className="fa-solid fa-circle-check text-emerald-500" />
              <span className="min-w-0 break-words">
                {tr(lang, {
                  vi: 'Đã mở khóa – nghe trọn bài thuyết minh.',
                  en: 'Unlocked – full narration available.',
                  ko: '잠금 해제됨 – 전체 해설을 들을 수 있어요.',
                  ja: 'ロック解除済み – 解説を全編お聞きいただけます。',
                  zh: '已解锁 – 可收听完整讲解。'
                })}
              </span>
              <button
                type="button"
                onClick={() => onOpenQr(site)}
                className="ml-auto text-slate-500 hover:text-sky-600 font-bold"
                title={tr(lang, { vi: 'Mã QR địa điểm', en: 'Site QR code', ko: '관광지 QR 코드', ja: 'スポットのQRコード', zh: '景点二维码' })}
              >
                <i className="fa-solid fa-qrcode" />
              </button>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50/70 border border-amber-200 px-3 py-2.5">
              <p className="text-xs text-amber-800 font-semibold leading-snug">
                <i className="fa-solid fa-lock mr-1.5 text-amber-500" />
                {trf(
                  lang,
                  {
                    vi: 'Nghe thử {n} giây — Mua vé để nghe trọn bài',
                    en: '{n}-second preview — Buy a ticket for the full narration',
                    ko: '{n}초 미리 듣기 — 이용권을 구매하면 전체 해설을 들을 수 있어요',
                    ja: '{n}秒の試聴 — チケットを購入すると解説を全編お聞きいただけます',
                    zh: '试听 {n} 秒 — 购买通票即可收听完整讲解'
                  },
                  { n: previewSecs }
                )}
                {fullDur > 0 && <span className="font-normal text-amber-700"> ({fmt(fullDur)})</span>}
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => openCheckout({ siteId: site.id, reason: 'manual' })}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 shadow-sm transition-colors"
                >
                  <i className="fa-solid fa-ticket" />{' '}
                  {tr(lang, { vi: 'Mua vé', en: 'Buy ticket', ko: '이용권 구매', ja: 'チケット購入', zh: '购买通票' })}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenQr(site)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 text-xs font-bold px-3 py-2 transition-colors"
                >
                  <i className="fa-solid fa-qrcode" />{' '}
                  {tr(lang, { vi: 'Mã QR', en: 'QR', ko: 'QR 코드', ja: 'QRコード', zh: '二维码' })}
                </button>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
};
