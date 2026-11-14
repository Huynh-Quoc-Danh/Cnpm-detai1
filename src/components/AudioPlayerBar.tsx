// Thanh phát thuyết minh nổi (toàn cục) – đọc trạng thái từ NarrationContext.
// Trên tab Bản đồ: ẩn ở màn hình lớn (thẻ "Thuyết minh Âm thanh" đã có trình phát) và thu gọn thành
// một dòng trên điện thoại để không che bản đồ / nút điều khiển; chạm để mở rộng.
import React, { useEffect, useState } from 'react';
import { useNarration } from '../context/NarrationContext';
import { SeekablePlayer } from './audio/SeekablePlayer';
import { formatTime } from '../services/narrationEngine';
import { tr } from '../i18n';

const T = {
  region: { vi: 'Trình phát thuyết minh', en: 'Narration player', ko: '해설 플레이어', ja: 'ガイドプレーヤー', zh: '讲解播放器' },
  collapse: { vi: 'Thu gọn trình phát', en: 'Collapse player', ko: '플레이어 접기', ja: 'プレーヤーを折りたたむ', zh: '收起播放器' },
  collapseShort: { vi: 'Thu gọn', en: 'Collapse', ko: '접기', ja: '折りたたむ', zh: '收起' },
  pause: { vi: 'Tạm dừng', en: 'Pause', ko: '일시 정지', ja: '一時停止', zh: '暂停' },
  play: { vi: 'Phát', en: 'Play', ko: '재생', ja: '再生', zh: '播放' },
  expand: { vi: 'Mở rộng trình phát', en: 'Expand player', ko: '플레이어 펼치기', ja: 'プレーヤーを展開', zh: '展开播放器' },
  previewEnded: { vi: 'Hết phần nghe thử', en: 'Preview ended', ko: '미리 듣기 종료', ja: '試聴終了', zh: '试听已结束' }
};

interface AudioPlayerBarProps {
  /** Ẩn từ breakpoint lg trở lên (khi trang đã có trình phát riêng). */
  hideOnDesktop?: boolean;
  /** Mặc định thu gọn thành mini player (điện thoại). */
  collapsible?: boolean;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({ hideOnDesktop = false, collapsible = false }) => {
  const n = useNarration();
  const { track, status, position, duration, previewSec, toggle } = n;
  const [expanded, setExpanded] = useState(!collapsible);
  useEffect(() => setExpanded(!collapsible), [collapsible]);
  if (!track) return null;
  const L = track.lang || n.lang;
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  const lockPct = previewSec != null && duration > 0 ? Math.min(100, (previewSec / duration) * 100) : null;
  const playing = status === 'playing';
  const loading = status === 'loading';

  return (
    <div
      className={`fixed z-[1100] left-1/2 -translate-x-1/2 bottom-20 lg:bottom-6 w-[calc(100%-16px)] sm:w-[calc(100%-32px)] max-w-3xl hl-audio-bar-in ${
        hideOnDesktop ? 'lg:hidden' : ''
      }`}
      role="region"
      aria-label={tr(L, T.region)}
    >
      {expanded ? (
        <div className="relative rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/70 shadow-2xl shadow-slate-900/40 px-3.5 py-3 sm:px-5 sm:py-3.5">
          {collapsible && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label={tr(L, T.collapse)}
              title={tr(L, T.collapseShort)}
              className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-6 rounded-full bg-slate-800 border border-slate-600 text-slate-200 flex items-center justify-center shadow"
            >
              <i className="fa-solid fa-chevron-down text-[11px]"></i>
            </button>
          )}
          <SeekablePlayer variant="full" />
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/70 shadow-xl shadow-slate-900/30 overflow-hidden">
          <div className="flex items-center gap-2.5 pl-2 pr-3 py-2">
            <button
              type="button"
              onClick={toggle}
              disabled={loading}
              aria-label={playing ? tr(L, T.pause) : tr(L, T.play)}
              className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center active:scale-95 transition"
            >
              <i className={`fa-solid ${loading ? 'fa-circle-notch fa-spin' : playing ? 'fa-pause' : 'fa-play ml-0.5'} text-sm`}></i>
            </button>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="min-w-0 flex-1 text-left"
              aria-label={tr(L, T.expand)}
            >
              <p className="text-[13px] font-bold text-white truncate">{track.title}</p>
              <p className="text-[11px] text-slate-400 tabular-nums truncate">
                {formatTime(position)} / {formatTime(duration)}
                {status === 'locked' && <span className="ml-1.5 text-amber-300">· {tr(L, T.previewEnded)}</span>}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label={tr(L, T.expand)}
              className="shrink-0 w-8 h-8 rounded-full text-slate-300 hover:bg-white/10 flex items-center justify-center"
            >
              <i className="fa-solid fa-chevron-up text-xs"></i>
            </button>
          </div>
          <div className="relative h-1 bg-slate-700">
            {lockPct != null && (
              <div className="absolute inset-y-0 right-0 bg-amber-400/25" style={{ left: `${lockPct}%` }} />
            )}
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-400 to-teal-400" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioPlayerBar;
