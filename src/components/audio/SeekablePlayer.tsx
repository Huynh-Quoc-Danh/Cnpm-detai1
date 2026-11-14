// Trình phát thuyết minh có thanh tua – 2 kiểu: 'compact' (thẻ sáng) và 'full' (thanh tối).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Exhibit, HeritageSite, LanguageCode } from '../../types';
import { RATE_OPTIONS, useNarration } from '../../context/NarrationContext';
import { formatTime } from '../../services/narrationEngine';
import { narrationDuration } from '../../i18n';

type Dict = {
  play: string; pause: string; back: string; fwd: string; speed: string; normal: string; volume: string;
  mute: string; unmute: string; close: string; more: string; preview: string; full: string; unlock: string;
  lockedMsg: (p: string, d: string) => string; tooltip: (p: string, d: string) => string;
  loading: string; seek: string; playing: string; paused: string; ended: string; replay: string;
  error: string; retry: string; noTrack: string; of: string;
};

const TEXT: Record<LanguageCode, Dict> = {
  vi: {
    play: 'Phát',
    pause: 'Tạm dừng',
    back: 'Lùi 15 giây',
    fwd: 'Tới 15 giây',
    speed: 'Tốc độ đọc',
    normal: 'Chuẩn',
    volume: 'Âm lượng',
    mute: 'Tắt tiếng',
    unmute: 'Bật tiếng',
    close: 'Đóng trình phát',
    more: 'Tùy chọn',
    preview: 'Bản nghe thử',
    full: 'Bản đầy đủ',
    unlock: 'Mở khóa toàn bộ thuyết minh',
    lockedMsg: (p: string, d: string) => `Bạn đã nghe hết bản thử ${p}. Mua vé để nghe trọn ${d}.`,
    tooltip: (p: string, d: string) => `Bản xem thử ${p} — Mua vé để nghe trọn ${d}`,
    loading: 'Đang tải…',
    seek: 'Thanh tua thuyết minh',
    playing: 'Đang phát',
    paused: 'Tạm dừng',
    ended: 'Đã nghe xong',
    replay: 'Nghe lại',
    error: 'Không phát được thuyết minh',
    retry: 'Thử lại',
    noTrack: 'Chọn một điểm để nghe thuyết minh',
    of: 'trên'
  },
  en: {
    play: 'Play',
    pause: 'Pause',
    back: 'Back 15 seconds',
    fwd: 'Forward 15 seconds',
    speed: 'Playback speed',
    normal: 'Normal',
    volume: 'Volume',
    mute: 'Mute',
    unmute: 'Unmute',
    close: 'Close player',
    more: 'Options',
    preview: 'Preview',
    full: 'Full version',
    unlock: 'Unlock the full narration',
    lockedMsg: (p: string, d: string) => `You've reached the end of the ${p} preview. Buy a ticket to hear all ${d}.`,
    tooltip: (p: string, d: string) => `Preview ${p} — Buy a ticket to hear the full ${d}`,
    loading: 'Loading…',
    seek: 'Narration seek bar',
    playing: 'Now playing',
    paused: 'Paused',
    ended: 'Finished',
    replay: 'Replay',
    error: 'Could not play the narration',
    retry: 'Retry',
    noTrack: 'Pick a site to hear its narration',
    of: 'of'
  },
  ko: {
    play: '재생',
    pause: '일시 정지',
    back: '15초 뒤로',
    fwd: '15초 앞으로',
    speed: '재생 속도',
    normal: '보통',
    volume: '음량',
    mute: '음소거',
    unmute: '음소거 해제',
    close: '플레이어 닫기',
    more: '옵션',
    preview: '미리 듣기',
    full: '전체 버전',
    unlock: '전체 해설 잠금 해제',
    lockedMsg: (p: string, d: string) => `${p} 미리 듣기가 끝났어요. 이용권을 구매하면 ${d} 전체를 들을 수 있어요.`,
    tooltip: (p: string, d: string) => `미리 듣기 ${p} — 이용권을 구매하면 ${d} 전체를 들을 수 있어요`,
    loading: '불러오는 중…',
    seek: '해설 탐색 막대',
    playing: '재생 중',
    paused: '일시 정지됨',
    ended: '재생 완료',
    replay: '다시 듣기',
    error: '해설을 재생할 수 없어요',
    retry: '다시 시도',
    noTrack: '해설을 들을 장소를 선택하세요',
    of: '/'
  },
  ja: {
    play: '再生',
    pause: '一時停止',
    back: '15秒戻る',
    fwd: '15秒進む',
    speed: '再生速度',
    normal: '標準',
    volume: '音量',
    mute: 'ミュート',
    unmute: 'ミュート解除',
    close: 'プレーヤーを閉じる',
    more: 'オプション',
    preview: '試聴',
    full: 'フルバージョン',
    unlock: 'ガイド全編をアンロック',
    lockedMsg: (p: string, d: string) => `${p}の試聴が終わりました。チケットを購入すると${d}の全編をお聴きいただけます。`,
    tooltip: (p: string, d: string) => `試聴 ${p} — チケット購入で${d}の全編を再生`,
    loading: '読み込み中…',
    seek: 'ガイドのシークバー',
    playing: '再生中',
    paused: '一時停止中',
    ended: '再生終了',
    replay: 'もう一度聴く',
    error: 'ガイドを再生できません',
    retry: '再試行',
    noTrack: 'スポットを選んでガイドをお聴きください',
    of: '/'
  },
  zh: {
    play: '播放',
    pause: '暂停',
    back: '后退 15 秒',
    fwd: '前进 15 秒',
    speed: '播放速度',
    normal: '正常',
    volume: '音量',
    mute: '静音',
    unmute: '取消静音',
    close: '关闭播放器',
    more: '选项',
    preview: '试听',
    full: '完整版',
    unlock: '解锁完整讲解',
    lockedMsg: (p: string, d: string) => `${p} 试听已结束。购买门票即可收听完整的 ${d} 讲解。`,
    tooltip: (p: string, d: string) => `试听 ${p} — 购买通票即可收听完整 ${d}`,
    loading: '加载中…',
    seek: '讲解进度条',
    playing: '正在播放',
    paused: '已暂停',
    ended: '播放完毕',
    replay: '重新收听',
    error: '无法播放讲解',
    retry: '重试',
    noTrack: '请选择一个景点收听讲解',
    of: '/'
  }
};

// ---------------------------------------------------------------------------
// Hook: đóng popover khi bấm ra ngoài / phím Esc
// ---------------------------------------------------------------------------
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

// ---------------------------------------------------------------------------
// Thanh tua
// ---------------------------------------------------------------------------
export interface SeekBarProps {
  position: number;
  duration: number;
  previewSec: number | null;
  onSeek: (sec: number) => void;
  dark?: boolean;
  disabled?: boolean;
  lang: LanguageCode;
  className?: string;
}

export const SeekBar: React.FC<SeekBarProps> = ({ position, duration, previewSec, onSeek, dark, disabled, lang, className = '' }) => {
  const t = TEXT[lang] || TEXT.vi;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const dur = duration > 0 ? duration : 0;
  const shown = drag != null ? drag * dur : position;
  const pct = dur ? Math.min(100, Math.max(0, (shown / dur) * 100)) : 0;
  const lockPct = previewSec != null && dur ? Math.min(100, (previewSec / dur) * 100) : null;
  const tooltip = previewSec != null ? t.tooltip(formatTime(previewSec), formatTime(dur)) : '';

  const ratioAt = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return r.width ? Math.min(1, Math.max(0, (clientX - r.left) / r.width)) : 0;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !dur) return;
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    try {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setDrag(ratioAt(e.clientX));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = ratioAt(e.clientX);
    if (drag != null) setDrag(r);
    else if (e.pointerType === 'mouse') setHover(r);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag == null) return;
    const r = ratioAt(e.clientX);
    setDrag(null);
    onSeek(r * dur);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || !dur) return;
    let target: number | null = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') target = position - 5;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') target = position + 5;
    else if (e.key === 'PageDown') target = position - 15;
    else if (e.key === 'PageUp') target = position + 15;
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = dur;
    if (target == null) return;
    e.preventDefault();
    onSeek(Math.max(0, Math.min(dur, target)));
  };

  const hoverSec = hover != null ? hover * dur : null;
  const hoverLocked = hoverSec != null && previewSec != null && hoverSec > previewSec;

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={t.seek}
      aria-valuemin={0}
      aria-valuemax={Math.round(dur)}
      aria-valuenow={Math.round(shown)}
      aria-valuetext={`${formatTime(shown)} ${t.of} ${formatTime(dur)}`}
      aria-disabled={disabled || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
      onPointerLeave={() => setHover(null)}
      onKeyDown={onKeyDown}
      className={`group relative h-5 flex items-center select-none touch-none outline-none rounded-full focus-visible:ring-2 focus-visible:ring-sky-400/70 ${
        disabled ? 'cursor-default opacity-60' : 'cursor-pointer'
      } ${className}`}
    >
      {/* Nền thanh */}
      <div
        className={`relative w-full h-1.5 group-hover:h-2 transition-[height] duration-150 rounded-full overflow-hidden ${
          dark ? 'bg-white/15' : 'bg-slate-200'
        }`}
      >
        {/* Vùng "đã tải" (sẵn sàng nghe) */}
        <div
          className={`absolute inset-y-0 left-0 ${dark ? 'bg-white/20' : 'bg-slate-300/70'}`}
          style={{ width: `${lockPct != null ? lockPct : 100}%` }}
        />
        {/* Vùng bị khóa */}
        {lockPct != null && lockPct < 100 && (
          <div
            className={`absolute inset-y-0 right-0 ${dark ? 'hl-audio-locked-dark' : 'hl-audio-locked'}`}
            style={{ left: `${lockPct}%` }}
          />
        )}
        {/* Đã nghe */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-500 to-teal-400"
          style={{ width: `${pct}%`, transition: drag != null ? 'none' : 'width 120ms linear' }}
        />
      </div>

      {/* Mốc khóa + tooltip */}
      {lockPct != null && lockPct < 100 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 hl-audio-lockpin"
          style={{ left: `${lockPct}%` }}
          title={tooltip}
        >
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] shadow ring-2 ${
              dark ? 'bg-amber-400 text-slate-900 ring-slate-900' : 'bg-amber-400 text-white ring-white'
            }`}
          >
            <i className="fa-solid fa-lock"></i>
          </div>
          <div className="hl-audio-tip pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-lg bg-slate-900 text-white text-[11px] font-semibold px-2.5 py-1.5 shadow-lg">
            {tooltip}
          </div>
        </div>
      )}

      {/* Núm kéo */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md ring-2 ring-sky-500 transition-transform z-20 ${
          drag != null ? 'scale-125' : 'scale-0 group-hover:scale-100 group-focus-visible:scale-100'
        }`}
        style={{ left: `${pct}%` }}
      />

      {/* Thời điểm khi rê chuột / kéo */}
      {(drag != null || hoverSec != null) && dur > 0 && (
        <div
          className={`pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums shadow z-30 ${
            hoverLocked && drag == null ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white'
          }`}
          style={{ left: `${(drag != null ? drag : hover!) * 100}%` }}
        >
          {hoverLocked && drag == null && <i className="fa-solid fa-lock mr-1 text-[9px]"></i>}
          {formatTime(drag != null ? drag * dur : hoverSec!)}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Popover: tốc độ / âm lượng
// ---------------------------------------------------------------------------
const RateList: React.FC<{ rate: number; onPick: (r: number) => void; dark?: boolean; t: Dict }> = ({ rate, onPick, dark, t }) => (
  <div className="flex flex-wrap gap-1">
    {RATE_OPTIONS.map((r) => (
      <button
        key={r}
        type="button"
        onClick={() => onPick(r)}
        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
          r === rate
            ? 'bg-sky-600 text-white'
            : dark
            ? 'bg-white/10 text-slate-200 hover:bg-white/20'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
        aria-pressed={r === rate}
      >
        {r === 1 ? `1× · ${t.normal}` : `${r}×`}
      </button>
    ))}
  </div>
);

const VolumeControl: React.FC<{ dark?: boolean; t: Dict; inline?: boolean }> = ({ dark, t, inline }) => {
  const n = useNarration();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const level = n.muted ? 0 : n.volume;
  const icon = level === 0 ? 'fa-volume-xmark' : level < 0.5 ? 'fa-volume-low' : 'fa-volume-high';
  const btn = dark
    ? 'text-slate-300 hover:text-white hover:bg-white/10'
    : 'text-slate-500 hover:text-slate-800 hover:bg-white';
  const slider = (
    <input
      type="range"
      min={0}
      max={1}
      step={0.05}
      value={level}
      onChange={(e) => n.setVolume(parseFloat(e.target.value))}
      aria-label={t.volume}
      className="hl-audio-range w-24 accent-sky-500"
      style={{ ['--hl-fill' as any]: `${level * 100}%` }}
    />
  );
  if (inline) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={n.toggleMute}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition ${btn}`}
          aria-label={n.muted ? t.unmute : t.mute}
          title={n.muted ? t.unmute : t.mute}
        >
          <i className={`fa-solid ${icon} text-sm`}></i>
        </button>
        {slider}
      </div>
    );
  }
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${btn}`}
        aria-label={t.volume}
        aria-expanded={open}
        title={t.volume}
      >
        <i className={`fa-solid ${icon} text-sm`}></i>
      </button>
      {open && (
        <div
          className={`absolute bottom-full right-0 mb-2 z-50 rounded-2xl border shadow-xl px-3 py-2.5 flex items-center gap-2 ${
            dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={n.toggleMute}
            className={`w-7 h-7 rounded-full flex items-center justify-center ${btn}`}
            aria-label={n.muted ? t.unmute : t.mute}
          >
            <i className={`fa-solid ${icon} text-xs`}></i>
          </button>
          {slider}
          <span className={`text-[11px] font-bold tabular-nums w-8 text-right ${dark ? 'text-slate-300' : 'text-slate-500'}`}>
            {Math.round(level * 100)}
          </span>
        </div>
      )}
    </div>
  );
};

const MoreMenu: React.FC<{ dark?: boolean; t: Dict; onClose?: () => void; disabled?: boolean }> = ({ dark, t, onClose, disabled }) => {
  const n = useNarration();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const item = dark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-50 text-slate-700';
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
          dark ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-800 hover:bg-white'
        }`}
        aria-label={t.more}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t.more}
      >
        <i className="fa-solid fa-ellipsis-vertical text-sm"></i>
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute bottom-full right-0 mb-2 z-50 w-60 rounded-2xl border shadow-xl p-2 ${
            dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <button
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={() => n.skip(-15)}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold disabled:opacity-40 ${item} ${
                dark ? 'bg-white/5' : 'bg-slate-100'
              }`}
            >
              <i className="fa-solid fa-rotate-left"></i> 15s
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={() => n.skip(15)}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold disabled:opacity-40 ${item} ${
                dark ? 'bg-white/5' : 'bg-slate-100'
              }`}
            >
              15s <i className="fa-solid fa-rotate-right"></i>
            </button>
          </div>
          <div className={`px-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-400'}`}>
            {t.speed}
          </div>
          <div className="px-1 pb-1">
            <RateList rate={n.rate} onPick={n.setRate} dark={dark} t={t} />
          </div>
          {onClose && n.track && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onClose();
              }}
              className={`mt-1.5 w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold ${
                dark ? 'text-rose-300 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'
              }`}
            >
              <i className="fa-solid fa-stop"></i> {t.close}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const RateButton: React.FC<{ dark?: boolean; t: Dict }> = ({ dark, t }) => {
  const n = useNarration();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`h-8 min-w-[44px] px-2 rounded-full text-[11px] font-extrabold tabular-nums border transition ${
          dark ? 'border-white/15 text-slate-200 hover:bg-white/10' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
        aria-label={t.speed}
        aria-expanded={open}
        title={t.speed}
      >
        {n.rate}×
      </button>
      {open && (
        <div
          className={`absolute bottom-full right-0 mb-2 z-50 rounded-2xl border shadow-xl p-2 w-56 ${
            dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <div className="px-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{t.speed}</div>
          <RateList
            rate={n.rate}
            onPick={(r) => {
              n.setRate(r);
              setOpen(false);
            }}
            dark={dark}
            t={t}
          />
        </div>
      )}
    </div>
  );
};

const Equalizer: React.FC<{ active: boolean }> = ({ active }) => (
  <div className={`hl-eq ${active ? 'is-active' : ''}`} aria-hidden="true">
    <span></span>
    <span></span>
    <span></span>
    <span></span>
  </div>
);

// ---------------------------------------------------------------------------
// SeekablePlayer
// ---------------------------------------------------------------------------
export interface SeekablePlayerProps {
  variant?: 'compact' | 'full';
  /** Compact: điểm mặc định khi chưa phát bài nào (bấm ▶ sẽ phát điểm này). */
  site?: HeritageSite | null;
  exhibit?: Exhibit | null;
  /** Ghi đè ngôn ngữ giao diện (mặc định theo NarrationProvider). */
  lang?: LanguageCode;
  /** Full: nút đóng (mặc định dừng phát). */
  onClose?: () => void;
  className?: string;
}

export const SeekablePlayer: React.FC<SeekablePlayerProps> = ({ variant = 'compact', site, exhibit, lang, onClose, className = '' }) => {
  const n = useNarration();
  const L: LanguageCode = lang || n.lang || 'vi';
  const t = TEXT[L] || TEXT.vi;
  const handleClose = onClose || n.stop;

  // Compact gắn với một điểm cụ thể: nếu bài đang phát là bài khác -> hiển thị trạng thái chờ của điểm đó
  const bound = !site || n.isCurrent(site.id, exhibit ? exhibit.id : undefined);
  const idleDuration = site ? narrationDuration(exhibit || site, L) : 0;
  const status = bound ? n.status : 'idle';
  const position = bound ? n.position : 0;
  const duration = bound && n.track ? n.duration : idleDuration;
  const previewSec = bound && n.track ? n.previewSec : null;
  const isPreview = bound && n.track ? n.isPreview : false;
  const hasTrack = bound && !!n.track;
  const playing = status === 'playing';
  const loading = status === 'loading';

  const onPlay = () => {
    if (!hasTrack) {
      if (site) {
        if (exhibit) n.playExhibit(site, exhibit, { lang: L });
        else n.playSite(site, { lang: L });
      }
      return;
    }
    n.toggle();
  };

  const onSeek = (sec: number) => {
    if (!hasTrack) return;
    n.seek(sec);
  };

  const playIcon = loading
    ? 'fa-circle-notch fa-spin'
    : playing
    ? 'fa-pause'
    : status === 'ended'
    ? 'fa-rotate-right'
    : status === 'locked'
    ? 'fa-lock'
    : 'fa-play';
  const playLabel = playing ? t.pause : status === 'ended' ? t.replay : status === 'locked' ? t.unlock : t.play;

  const lockedCta = hasTrack && status === 'locked' && previewSec != null && (
    <LockedCta t={t} previewSec={previewSec} duration={duration} onUnlock={n.unlock} dark={variant === 'full'} />
  );
  const errorRow = hasTrack && status === 'error' && (
    <div
      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
        variant === 'full' ? 'bg-rose-500/15 text-rose-200' : 'bg-rose-50 text-rose-700'
      }`}
    >
      <span>
        <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
        {n.errorMessage || t.error}
      </span>
      <button type="button" onClick={n.resume} className="font-extrabold underline underline-offset-2">
        {t.retry}
      </button>
    </div>
  );
  const noticeRow = hasTrack && n.notice && status !== 'error' && (
    <div className={`text-[11px] leading-snug flex gap-1.5 ${variant === 'full' ? 'text-amber-200/90' : 'text-amber-700'}`}>
      <i className="fa-solid fa-circle-info mt-0.5"></i>
      <span>{n.notice}</span>
    </div>
  );
  const previewPill = isPreview && (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap"
      title={previewSec != null ? t.tooltip(formatTime(previewSec), formatTime(duration)) : undefined}
    >
      <i className="fa-solid fa-headphones-simple"></i> {t.preview}
      {previewSec != null && <span className="font-bold normal-case opacity-80">· {formatTime(previewSec)}</span>}
    </span>
  );

  // ----------------------------- COMPACT -----------------------------
  if (variant === 'compact') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-2 sm:gap-2.5 rounded-full bg-slate-100 border border-slate-200 pl-1.5 pr-1 py-1.5">
          <button
            type="button"
            onClick={onPlay}
            disabled={!hasTrack && !site}
            className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center shadow-sm transition disabled:opacity-40 ${
              status === 'locked'
                ? 'bg-amber-400 text-white hover:bg-amber-500'
                : playing
                ? 'bg-gradient-to-br from-sky-600 to-teal-500 text-white'
                : 'bg-white text-slate-800 hover:bg-sky-50 hover:text-sky-700'
            }`}
            aria-label={playLabel}
            title={playLabel}
          >
            <i className={`fa-solid ${playIcon} text-sm ${playIcon === 'fa-play' ? 'ml-0.5' : ''}`}></i>
          </button>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600">
            {formatTime(position)} / {formatTime(duration)}
          </span>
          <SeekBar
            position={position}
            duration={duration}
            previewSec={previewSec}
            onSeek={onSeek}
            disabled={!hasTrack || loading}
            lang={L}
            className="flex-1 min-w-[60px]"
          />
          <VolumeControl t={t} />
          <MoreMenu t={t} onClose={hasTrack ? handleClose : undefined} disabled={!hasTrack} />
        </div>
        {(previewPill || (hasTrack && n.track)) && !lockedCta && (
          <div className="flex items-center gap-2 px-1 min-h-[18px]">
            {previewPill}
            {hasTrack && n.track && (
              <span className="text-[11px] text-slate-500 truncate">
                {loading ? t.loading : playing ? t.playing : status === 'ended' ? t.ended : t.paused}
                {' · '}
                <span className="font-semibold text-slate-700">{n.track.title}</span>
              </span>
            )}
          </div>
        )}
        {lockedCta}
        {errorRow}
        {noticeRow}
      </div>
    );
  }

  // ------------------------------ FULL ------------------------------
  const track = n.track;
  if (!track) {
    return (
      <div className={`flex items-center gap-3 text-slate-300 text-sm px-4 py-3 ${className}`}>
        <i className="fa-solid fa-headphones"></i> {t.noTrack}
      </div>
    );
  }

  const controls = (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        onClick={() => n.skip(-15)}
        disabled={loading}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition disabled:opacity-40"
        aria-label={t.back}
        title={t.back}
      >
        <i className="fa-solid fa-rotate-left text-base"></i>
        <span className="absolute text-[8px] font-extrabold mt-0.5">15</span>
      </button>
      <button
        type="button"
        onClick={onPlay}
        className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition active:scale-95 ${
          status === 'locked'
            ? 'bg-amber-400 text-slate-900 hover:bg-amber-300'
            : 'bg-white text-slate-900 hover:bg-sky-100'
        }`}
        aria-label={playLabel}
        title={playLabel}
      >
        <i className={`fa-solid ${playIcon} ${playIcon === 'fa-play' ? 'ml-0.5' : ''}`}></i>
      </button>
      <button
        type="button"
        onClick={() => n.skip(15)}
        disabled={loading}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition disabled:opacity-40"
        aria-label={t.fwd}
        title={t.fwd}
      >
        <i className="fa-solid fa-rotate-right text-base"></i>
        <span className="absolute text-[8px] font-extrabold mt-0.5">15</span>
      </button>
    </div>
  );

  return (
    <div className={`text-white ${className}`}>
      <div className="flex items-center gap-3">
        {/* Ảnh + sóng âm */}
        <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl overflow-hidden bg-slate-700 ring-1 ring-white/10">
          {track.image && (
            <img
              src={track.image}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
            />
          )}
          <div className="absolute inset-0 bg-slate-900/45 flex items-center justify-center">
            {loading ? <i className="fa-solid fa-circle-notch fa-spin text-sky-300"></i> : <Equalizer active={playing} />}
          </div>
        </div>

        {/* Tiêu đề */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-extrabold text-sm sm:text-[15px] truncate">{track.title}</span>
            {previewPill && <span className="hidden sm:inline-flex">{previewPill}</span>}
          </div>
          <div className="text-[11px] sm:text-xs text-sky-300/90 truncate">
            <span className="font-semibold">{loading ? t.loading : playing ? t.playing : status === 'ended' ? t.ended : status === 'locked' ? t.preview : t.paused}</span>
            {track.subtitle && <span className="text-slate-400"> · {track.subtitle}</span>}
          </div>
          {previewPill && <div className="sm:hidden mt-1">{previewPill}</div>}
        </div>

        {/* Điều khiển (desktop) */}
        <div className="hidden md:flex items-center">{controls}</div>

        <div className="hidden md:flex items-center gap-1.5 pl-1">
          <RateButton dark t={t} />
          <div className="hidden lg:block">
            <VolumeControl dark t={t} inline />
          </div>
          <div className="lg:hidden">
            <VolumeControl dark t={t} />
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-500/80 transition"
          aria-label={t.close}
          title={t.close}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      {/* Thanh tua */}
      <div className="mt-2.5 flex items-center gap-2.5">
        <span className="w-10 text-right text-[11px] font-semibold tabular-nums text-slate-300">{formatTime(position)}</span>
        <SeekBar
          position={position}
          duration={duration}
          previewSec={previewSec}
          onSeek={onSeek}
          dark
          disabled={loading}
          lang={L}
          className="flex-1"
        />
        <span className="w-10 text-[11px] font-semibold tabular-nums text-slate-400">{formatTime(duration)}</span>
      </div>

      {/* Điều khiển (mobile) */}
      <div className="md:hidden mt-1.5 flex items-center justify-between">
        <RateButton dark t={t} />
        {controls}
        <VolumeControl dark t={t} />
      </div>

      {(lockedCta || errorRow || noticeRow) && (
        <div className="mt-2.5 space-y-2">
          {lockedCta}
          {errorRow}
          {noticeRow}
        </div>
      )}
    </div>
  );
};

const LockedCta: React.FC<{ t: Dict; previewSec: number; duration: number; onUnlock: () => void; dark?: boolean }> = ({
  t,
  previewSec,
  duration,
  onUnlock,
  dark
}) => (
  <div
    className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-2xl px-3 py-2.5 border ${
      dark ? 'bg-amber-400/10 border-amber-300/30' : 'bg-amber-50 border-amber-200'
    }`}
  >
    <div className={`flex items-start gap-2 text-xs flex-1 ${dark ? 'text-amber-100' : 'text-amber-900'}`}>
      <i className="fa-solid fa-lock mt-0.5 text-amber-500"></i>
      <span>{t.lockedMsg(formatTime(previewSec), formatTime(duration))}</span>
    </div>
    <button
      type="button"
      onClick={onUnlock}
      className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-extrabold px-4 py-2 shadow-md shadow-orange-500/20 hover:brightness-105 active:scale-[0.98] transition"
    >
      <i className="fa-solid fa-unlock-keyhole"></i>
      {t.unlock}
    </button>
  </div>
);

export default SeekablePlayer;
