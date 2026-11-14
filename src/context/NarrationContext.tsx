// Trình phát thuyết minh toàn cục: tải nội dung (bản thử / bản đầy đủ theo vé), tua, khóa khi hết bản thử.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Exhibit, HeritageSite, LanguageCode, NarrationPayload } from '../types';
import { api, ApiError } from '../services/api';
import { getOfflinePreview } from '../data/offlineSites';
import { useEntitlement } from './EntitlementContext';
import { BackendKind, EngineNotice, NarrationEngine, primeAudio, warmUpVoices } from '../services/narrationEngine';
import {
  exhibitName,
  exhibitZone,
  isLanguageCode,
  narrationDuration,
  siteName as siteNameOf,
  siteText,
  tr,
  trf,
  type TrMap
} from '../i18n';

export type NarrationStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'locked' | 'error';

export interface NarrationTrack {
  key: string;
  siteId: number;
  exhibitId?: string;
  title: string;
  subtitle?: string;
  image?: string;
  lang: LanguageCode;
}

export interface NarrationContextValue {
  track: NarrationTrack | null;
  status: NarrationStatus;
  /** Vị trí hiện tại (giây). */
  position: number;
  /** Thời lượng ĐẦY ĐỦ (giây). */
  duration: number;
  /** Giới hạn bản nghe thử (giây); null nếu đã có vé. */
  previewSec: number | null;
  isPreview: boolean;
  rate: number;
  volume: number;
  muted: boolean;
  /** Extra: ngôn ngữ giao diện của provider. */
  lang: LanguageCode;
  /** Extra: thông báo nhẹ (vd. thiết bị thiếu giọng đọc) đã dịch theo ngôn ngữ. */
  notice: string | null;
  /** Thiết bị không có giọng đọc cho ngôn ngữ đang phát (vẫn thử đọc bằng giọng mặc định của trình duyệt). */
  noVoice: boolean;
  /** Ngôn ngữ thật của văn bản đang đọc (khác track.lang khi ko/ja/zh chưa có bản dịch -> en -> vi). */
  speechLang: LanguageCode | null;
  /** Extra: thông báo lỗi khi status = 'error'. */
  errorMessage: string | null;
  /** Extra: backend đang dùng. */
  backend: BackendKind | null;
  /** Extra: đang dùng dữ liệu ngoại tuyến. */
  offline: boolean;
  playSite: (site: HeritageSite, opts?: { lang?: LanguageCode }) => void;
  playExhibit: (site: HeritageSite, exhibit: Exhibit, opts?: { lang?: LanguageCode }) => void;
  toggle: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (sec: number) => void;
  skip: (deltaSec: number) => void;
  setRate: (r: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  /** Extra: mở thanh toán cho bài đang phát. */
  unlock: () => void;
  /** Extra: bài đang phát có phải của site/exhibit này không. */
  isCurrent: (siteId: number, exhibitId?: string) => boolean;
}

const NarrationContext = createContext<NarrationContextValue | null>(null);

const PREFS_KEY = 'hl_audio_prefs';
export const RATE_OPTIONS = [0.75, 1, 1.25, 1.5];

interface Prefs {
  rate: number;
  volume: number;
  muted: boolean;
}

function readPrefs(): Prefs {
  const def: Prefs = { rate: 1, volume: 1, muted: false };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return def;
    const p = JSON.parse(raw);
    return {
      rate: typeof p.rate === 'number' && p.rate >= 0.5 && p.rate <= 2 ? p.rate : 1,
      volume: typeof p.volume === 'number' && p.volume >= 0 && p.volume <= 1 ? p.volume : 1,
      muted: !!p.muted
    };
  } catch {
    return def;
  }
}

function writePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** Tên ngôn ngữ (đối tượng) viết bằng ngôn ngữ giao diện – dùng trong thông báo thiếu giọng đọc. */
const LANG_NAME_IN: Record<LanguageCode, TrMap> = {
  vi: { vi: 'tiếng Việt', en: 'Vietnamese', ko: '베트남어', ja: 'ベトナム語', zh: '越南语' },
  en: { vi: 'tiếng Anh', en: 'English', ko: '영어', ja: '英語', zh: '英语' },
  ko: { vi: 'tiếng Hàn', en: 'Korean', ko: '한국어', ja: '韓国語', zh: '韩语' },
  ja: { vi: 'tiếng Nhật', en: 'Japanese', ko: '일본어', ja: '日本語', zh: '日语' },
  zh: { vi: 'tiếng Trung', en: 'Chinese', ko: '중국어', ja: '中国語', zh: '中文' }
};

const NOTICES: Record<Exclude<EngineNotice, null>, TrMap> = {
  'no-tts': {
    vi: 'Trình duyệt không hỗ trợ giọng đọc — đang hiển thị tiến trình không tiếng. Hãy dùng Chrome, Edge hoặc Safari.',
    en: 'This browser has no speech support — progress is shown without sound. Try Chrome, Edge or Safari.',
    ko: '이 브라우저는 음성 읽기를 지원하지 않아 소리 없이 진행 상황만 표시됩니다. Chrome, Edge 또는 Safari를 사용해 주세요.',
    ja: 'このブラウザは音声読み上げに対応していないため、音声なしで進行状況のみ表示しています。Chrome、Edge、Safariをお使いください。',
    zh: '此浏览器不支持语音朗读，目前仅显示播放进度而没有声音。请使用 Chrome、Edge 或 Safari。'
  },
  // {lang} = tên ngôn ngữ của bài đang đọc
  'no-voice': {
    vi: 'Thiết bị chưa có giọng đọc {lang} — trình duyệt sẽ thử đọc bằng giọng mặc định. Hãy cài giọng {lang} trong cài đặt máy hoặc dùng Chrome/Edge.',
    en: 'This device has no {lang} voice — the browser will try its default voice. Install a {lang} voice in system settings or use Chrome/Edge.',
    ko: '이 기기에는 {lang} 음성이 없어 브라우저 기본 음성으로 읽어 봅니다. 시스템 설정에서 {lang} 음성을 설치하거나 Chrome/Edge를 사용해 주세요.',
    ja: 'この端末には{lang}の音声がないため、ブラウザの既定の音声で読み上げを試みます。システム設定で{lang}の音声を追加するか、Chrome/Edgeをお使いください。',
    zh: '此设备尚未安装{lang}语音，浏览器将尝试使用默认语音朗读。请在系统设置中安装{lang}语音，或使用 Chrome/Edge。'
  },
  'tts-error': {
    vi: 'Giọng đọc gặp sự cố — tiến trình vẫn tiếp tục không tiếng.',
    en: 'Speech engine failed — progress continues without sound.',
    ko: '음성 읽기에 문제가 생겼습니다. 소리 없이 계속 진행됩니다.',
    ja: '音声の読み上げで問題が発生しました。音声なしで再生を続けます。',
    zh: '语音朗读出现问题，将继续无声播放进度。'
  },
  'autoplay-blocked': {
    vi: 'Trình duyệt chặn tự phát âm thanh — nhấn ▶ để nghe.',
    en: 'Autoplay was blocked by the browser — tap ▶ to listen.',
    ko: '브라우저가 자동 재생을 차단했습니다. ▶ 버튼을 눌러 들어 보세요.',
    ja: 'ブラウザが自動再生をブロックしました。▶ をタップして再生してください。',
    zh: '浏览器阻止了自动播放，请点击 ▶ 收听。'
  },
  'audio-error': {
    vi: 'Không tải được file âm thanh — chuyển sang giọng đọc tự động.',
    en: 'Audio file failed to load — switched to synthesized voice.',
    ko: '오디오 파일을 불러오지 못해 자동 음성으로 전환했습니다.',
    ja: '音声ファイルを読み込めなかったため、自動音声に切り替えました。',
    zh: '音频文件加载失败，已切换为合成语音。'
  }
};

/** Đoán ngôn ngữ của văn bản (bản thử ngoại tuyến không ghi rõ ngôn ngữ sau khi fallback). */
function detectTextLang(text: string, wanted: LanguageCode): LanguageCode {
  if (/[\uac00-\ud7af]/.test(text)) return 'ko';
  if (/[\u3040-\u30ff]/.test(text)) return 'ja';
  if (/[\u4e00-\u9fff]/.test(text)) return wanted === 'ja' ? 'ja' : 'zh';
  if (wanted === 'vi' || wanted === 'en') return wanted;
  return /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(text) ? 'vi' : 'en';
}

interface Current {
  site: HeritageSite;
  exhibit: Exhibit | null;
  lang: LanguageCode;
}

function makeTrack(site: HeritageSite, exhibit: Exhibit | null, lang: LanguageCode): NarrationTrack {
  const sName = siteNameOf(site, lang);
  if (exhibit) {
    const zone = exhibitZone(exhibit, lang);
    return {
      key: `${site.id}:${exhibit.id}`,
      siteId: site.id,
      exhibitId: exhibit.id,
      title: exhibitName(exhibit, lang),
      subtitle: zone ? `${sName} · ${zone}` : sName,
      image: exhibit.image || site.image,
      lang
    };
  }
  return {
    key: String(site.id),
    siteId: site.id,
    title: sName,
    subtitle:
      siteText(site, lang, 'category') ||
      tr(lang, { vi: 'Thuyết minh', en: 'Audio guide', ko: '오디오 가이드', ja: '音声ガイド', zh: '语音导览' }),
    image: site.image,
    lang
  };
}

export const NarrationProvider: React.FC<{ lang: LanguageCode; children: React.ReactNode }> = ({ lang, children }) => {
  const { tickets, tokenFor, openCheckout } = useEntitlement();
  // Khoá thay đổi khi danh sách vé thay đổi (mua thêm vé / vé hết hạn)
  const token = tickets.map((t) => t.token).sort().join(',') || null;

  const initialPrefs = useMemo(readPrefs, []);
  const [track, setTrack] = useState<NarrationTrack | null>(null);
  const [status, setStatus] = useState<NarrationStatus>('idle');
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [previewSec, setPreviewSec] = useState<number | null>(null);
  const [rate, setRateState] = useState(initialPrefs.rate);
  const [volume, setVolumeState] = useState(initialPrefs.volume);
  const [muted, setMuted] = useState(initialPrefs.muted);
  const [noticeCode, setNoticeCode] = useState<EngineNotice>(null);
  const [speechLang, setSpeechLang] = useState<LanguageCode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backend, setBackend] = useState<BackendKind | null>(null);
  const [offline, setOffline] = useState(false);

  // Refs để callback luôn đọc giá trị mới nhất
  const currentRef = useRef<Current | null>(null);
  const statusRef = useRef<NarrationStatus>('idle');
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const previewRef = useRef<number | null>(null);
  const prefsRef = useRef<Prefs>(initialPrefs);
  const tokenForRef = useRef(tokenFor);
  const openCheckoutRef = useRef(openCheckout);
  const reqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastTimeEmit = useRef(0);

  openCheckoutRef.current = openCheckout;
  useEffect(() => warmUpVoices(), []);
  tokenForRef.current = tokenFor;

  const setStatusBoth = useCallback((s: NarrationStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const setPositionBoth = useCallback((p: number, force = false) => {
    positionRef.current = p;
    // Giới hạn tần suất render ~10 lần/giây
    const t = Date.now();
    if (force || t - lastTimeEmit.current > 90) {
      lastTimeEmit.current = t;
      setPosition(p);
    }
  }, []);

  const triggerCheckout = useCallback((reason: 'preview-ended' | 'manual') => {
    const cur = currentRef.current;
    openCheckoutRef.current({ siteId: cur ? cur.site.id : undefined, reason });
  }, []);

  const engineRef = useRef<NarrationEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new NarrationEngine({
      onTime: (s) => setPositionBoth(s),
      onState: (s) => {
        switch (s) {
          case 'loading':
            setStatusBoth('loading');
            break;
          case 'ready':
            setStatusBoth('paused');
            break;
          case 'playing':
            setStatusBoth('playing');
            break;
          case 'paused':
            if (statusRef.current !== 'locked') setStatusBoth('paused');
            break;
          case 'ended':
            setPositionBoth(durationRef.current, true);
            setStatusBoth('ended');
            break;
          case 'limit': {
            setPositionBoth(previewRef.current ?? positionRef.current, true);
            setStatusBoth('locked');
            triggerCheckout('preview-ended');
            break;
          }
          case 'error':
            setStatusBoth('error');
            break;
        }
      },
      onDuration: (d) => {
        durationRef.current = d;
        setDuration(d);
      },
      onNotice: (n) => setNoticeCode(n),
      onBackend: (k) => setBackend(k)
    });
  }

  // ---- tải bài ----
  const loadTrack = useCallback(
    async (site: HeritageSite, exhibit: Exhibit | null, tl: LanguageCode, startAt: number, autoplay: boolean, quietLock = false) => {
      const engine = engineRef.current!;
      const req = ++reqRef.current;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      engine.pause();
      currentRef.current = { site, exhibit, lang: tl };
      setTrack(makeTrack(site, exhibit, tl));
      setErrorMessage(null);
      setStatusBoth('loading');

      const fallbackDur = narrationDuration(exhibit || site, tl);
      if (startAt === 0) {
        setPositionBoth(0, true);
        durationRef.current = fallbackDur;
        setDuration(fallbackDur);
      }

      let payload: NarrationPayload;
      let isOffline = false;
      try {
        payload = await api.getNarration(site.id, tl, {
          exhibitId: exhibit ? exhibit.id : undefined,
          token: tokenForRef.current(site.id),
          signal: ac.signal
        });
      } catch (err: any) {
        if (req !== reqRef.current) return;
        if (err && err.name === 'AbortError') return;
        if (err instanceof ApiError && err.status !== 0) {
          setErrorMessage(err.message);
          setStatusBoth('error');
          return;
        }
        // Mất kết nối -> dùng bản thử ngoại tuyến (không bao giờ có bản đầy đủ)
        const text = getOfflinePreview(site.id, tl, exhibit ? exhibit.id : undefined);
        if (!text) {
          setErrorMessage(
            tr(tl, {
              vi: 'Không thể kết nối máy chủ.',
              en: 'Cannot reach the server.',
              ko: '서버에 연결할 수 없습니다.',
              ja: 'サーバーに接続できません。',
              zh: '无法连接服务器。'
            })
          );
          setStatusBoth('error');
          return;
        }
        isOffline = true;
        payload = { locked: true, text, durationSec: fallbackDur || 30, previewSec: 30, audioUrl: null, lang: detectTextLang(text, tl) };
      }
      if (req !== reqRef.current) return;
      setOffline(isOffline);
      // Ngôn ngữ thật của văn bản (server trả về khi ko/ja/zh fallback sang en/vi) -> chọn đúng giọng đọc
      const textLang: LanguageCode = isLanguageCode(payload.lang) ? payload.lang : detectTextLang(payload.text || '', tl);
      setSpeechLang(textLang);

      const full = Math.max(1, payload.durationSec || fallbackDur || 1);
      const locked = !!payload.locked && payload.previewSec < full;
      const limit = locked ? Math.max(1, payload.previewSec) : null;
      durationRef.current = full;
      previewRef.current = limit;
      setDuration(full);
      setPreviewSec(limit);

      let start = Math.max(0, Math.min(startAt, full));
      if (limit != null && start >= limit - 0.05) {
        // Đã ở cuối bản thử -> giữ trạng thái khóa
        start = limit;
        setPositionBoth(limit, true);
        await engine.load(
          { text: payload.text, durationSec: full, limitSec: limit, textSpanSec: limit, audioUrl: payload.audioUrl, lang: textLang },
          { ...prefsRef.current, startAt: limit, autoplay: false }
        );
        if (req !== reqRef.current) return;
        setStatusBoth('locked');
        if (!quietLock) triggerCheckout('preview-ended');
        return;
      }
      setPositionBoth(start, true);
      await engine.load(
        {
          text: payload.text,
          durationSec: full,
          limitSec: limit,
          textSpanSec: limit != null ? limit : full,
          audioUrl: payload.audioUrl,
          lang: textLang
        },
        { ...prefsRef.current, startAt: start, autoplay }
      );
    },
    [setPositionBoth, setStatusBoth, triggerCheckout]
  );

  const isCurrent = useCallback((siteId: number, exhibitId?: string) => {
    const cur = currentRef.current;
    if (!cur || cur.site.id !== siteId) return false;
    return (cur.exhibit ? cur.exhibit.id : undefined) === exhibitId;
  }, []);

  const resume = useCallback(() => {
    const cur = currentRef.current;
    if (!cur) return;
    primeAudio(); // iOS: mở khoá âm thanh ngay trong thao tác chạm
    const engine = engineRef.current!;
    const st = statusRef.current;
    if (st === 'locked') {
      triggerCheckout('manual');
      return;
    }
    if (st === 'error' || st === 'idle') {
      loadTrack(cur.site, cur.exhibit, cur.lang, positionRef.current, true);
      return;
    }
    if (st === 'ended') {
      engine.seek(0);
      setPositionBoth(0, true);
    }
    engine.play();
  }, [loadTrack, setPositionBoth, triggerCheckout]);

  const pause = useCallback(() => {
    engineRef.current!.pause();
  }, []);

  const startOrResume = useCallback(
    (site: HeritageSite, exhibit: Exhibit | null, l?: LanguageCode) => {
      primeAudio(); // iOS: phải gọi đồng bộ trong cử chỉ chạm, trước mọi await
      const tl = l || lang;
      const cur = currentRef.current;
      const same =
        cur && cur.site.id === site.id && (cur.exhibit ? cur.exhibit.id : null) === (exhibit ? exhibit.id : null) && cur.lang === tl;
      if (same && statusRef.current !== 'error' && statusRef.current !== 'idle') {
        if (statusRef.current === 'playing' || statusRef.current === 'loading') return;
        resume();
        return;
      }
      loadTrack(site, exhibit, tl, 0, true);
    },
    [lang, loadTrack, resume]
  );

  const playSite = useCallback(
    (site: HeritageSite, opts?: { lang?: LanguageCode }) => startOrResume(site, null, opts?.lang),
    [startOrResume]
  );
  const playExhibit = useCallback(
    (site: HeritageSite, exhibit: Exhibit, opts?: { lang?: LanguageCode }) => startOrResume(site, exhibit, opts?.lang),
    [startOrResume]
  );

  const toggle = useCallback(() => {
    const st = statusRef.current;
    if (st === 'playing') pause();
    else if (st !== 'loading') resume();
  }, [pause, resume]);

  const stop = useCallback(() => {
    reqRef.current++;
    abortRef.current?.abort();
    engineRef.current!.destroy();
    currentRef.current = null;
    previewRef.current = null;
    setTrack(null);
    setStatusBoth('idle');
    setPositionBoth(0, true);
    setDuration(0);
    durationRef.current = 0;
    setPreviewSec(null);
    setNoticeCode(null);
    setSpeechLang(null);
    setErrorMessage(null);
    setBackend(null);
  }, [setPositionBoth, setStatusBoth]);

  const seek = useCallback(
    (sec: number) => {
      if (!currentRef.current) return;
      const engine = engineRef.current!;
      const dur = durationRef.current;
      const limit = previewRef.current;
      let t = Math.max(0, Math.min(sec, dur));
      if (limit != null && t >= limit - 0.05) {
        // Tua qua phần bị khóa -> dừng ở cuối bản thử và mở thanh toán
        t = limit;
        engine.pause();
        engine.seek(t);
        setPositionBoth(t, true);
        setStatusBoth('locked');
        triggerCheckout('preview-ended');
        return;
      }
      const st = statusRef.current;
      if (st === 'loading') return;
      engine.seek(t);
      setPositionBoth(t, true);
      if (st === 'locked' || st === 'ended') setStatusBoth('paused');
    },
    [setPositionBoth, setStatusBoth, triggerCheckout]
  );

  const skip = useCallback((delta: number) => seek(positionRef.current + delta), [seek]);

  const setRate = useCallback((r: number) => {
    prefsRef.current = { ...prefsRef.current, rate: r };
    writePrefs(prefsRef.current);
    setRateState(r);
    engineRef.current!.setRate(r);
  }, []);

  const setVolume = useCallback((v: number) => {
    const vol = Math.max(0, Math.min(1, v));
    const m = vol === 0 ? prefsRef.current.muted : false;
    prefsRef.current = { ...prefsRef.current, volume: vol, muted: m };
    writePrefs(prefsRef.current);
    setVolumeState(vol);
    setMuted(m);
    engineRef.current!.setVolume(vol, m);
  }, []);

  const toggleMute = useCallback(() => {
    const m = !prefsRef.current.muted;
    let vol = prefsRef.current.volume;
    if (!m && vol === 0) vol = 0.8;
    prefsRef.current = { ...prefsRef.current, muted: m, volume: vol };
    writePrefs(prefsRef.current);
    setMuted(m);
    setVolumeState(vol);
    engineRef.current!.setVolume(vol, m);
  }, []);

  const unlock = useCallback(() => triggerCheckout('manual'), [triggerCheckout]);

  // ---- vé thay đổi -> tải lại (đầy đủ nếu được mở khóa) và tiếp tục ----
  const prevToken = useRef(token);
  useEffect(() => {
    if (prevToken.current === token) return;
    prevToken.current = token;
    const cur = currentRef.current;
    if (!cur) return;
    const st = statusRef.current;
    const wasPreview = previewRef.current != null;
    if (!wasPreview && tokenForRef.current(cur.site.id)) return; // đã nghe bản đầy đủ
    if (wasPreview && !tokenForRef.current(cur.site.id)) return; // vé mới không áp dụng cho điểm này
    const autoplay = st === 'playing' || st === 'locked' || st === 'loading';
    loadTrack(cur.site, cur.exhibit, cur.lang, positionRef.current, autoplay, true);
  }, [token, loadTrack]);

  // ---- đổi ngôn ngữ -> tải lại cùng bài ở vị trí tương đối ----
  useEffect(() => {
    const cur = currentRef.current;
    if (!cur || cur.lang === lang) return;
    const st = statusRef.current;
    const oldDur = durationRef.current || 1;
    const newDur = narrationDuration(cur.exhibit || cur.site, lang) || oldDur;
    let startAt = st === 'ended' ? 0 : (positionRef.current / oldDur) * newDur;
    // đang khóa ở cuối bản nghe thử -> giữ nguyên khóa (không mở thêm vài giây khi bài mới ngắn hơn)
    if (st === 'locked') startAt = Math.max(startAt, previewRef.current ?? positionRef.current);
    loadTrack(cur.site, cur.exhibit, lang, startAt, st === 'playing' || st === 'loading', true);
  }, [lang, loadTrack]);

  // ---- dừng khi unmount ----
  useEffect(() => {
    const engine = engineRef.current!;
    return () => {
      abortRef.current?.abort();
      engine.destroy();
    };
  }, []);

  // ---- Media Session (điều khiển trên màn hình khóa / tai nghe) ----
  useEffect(() => {
    const ms: any = typeof navigator !== 'undefined' ? (navigator as any).mediaSession : null;
    if (!ms) return;
    try {
      if (!track) {
        ms.metadata = null;
        return;
      }
      const W: any = window as any;
      if (W.MediaMetadata) {
        const img = track.image ? new URL(track.image, window.location.href).href : undefined;
        ms.metadata = new W.MediaMetadata({
          title: track.title,
          artist: track.subtitle || 'Hạ Long SmartGuide',
          album: 'Hạ Long SmartGuide',
          artwork: img ? [{ src: img, sizes: '512x512' }] : []
        });
      }
      const set = (a: string, h: any) => {
        try {
          ms.setActionHandler(a, h);
        } catch {
          /* ignore */
        }
      };
      set('play', () => resume());
      set('pause', () => pause());
      set('stop', () => stop());
      set('seekbackward', (d: any) => skip(-(d && d.seekOffset ? d.seekOffset : 15)));
      set('seekforward', (d: any) => skip(d && d.seekOffset ? d.seekOffset : 15));
      set('seekto', (d: any) => d && typeof d.seekTime === 'number' && seek(d.seekTime));
    } catch {
      /* ignore */
    }
  }, [track, resume, pause, stop, skip, seek]);

  useEffect(() => {
    const ms: any = typeof navigator !== 'undefined' ? (navigator as any).mediaSession : null;
    if (!ms) return;
    try {
      ms.playbackState = status === 'playing' ? 'playing' : track ? 'paused' : 'none';
    } catch {
      /* ignore */
    }
  }, [status, track]);

  const uiLang = track ? track.lang : lang;
  const noVoice = noticeCode === 'no-voice';
  const notice = noticeCode
    ? trf(uiLang, NOTICES[noticeCode], { lang: tr(uiLang, LANG_NAME_IN[speechLang || uiLang]) })
    : null;
  const isPreview = previewSec != null;

  const value = useMemo<NarrationContextValue>(
    () => ({
      track,
      status,
      position,
      duration,
      previewSec,
      isPreview,
      rate,
      volume,
      muted,
      lang,
      notice,
      noVoice,
      speechLang,
      errorMessage,
      backend,
      offline,
      playSite,
      playExhibit,
      toggle,
      pause,
      resume,
      stop,
      seek,
      skip,
      setRate,
      setVolume,
      toggleMute,
      unlock,
      isCurrent
    }),
    [
      track,
      status,
      position,
      duration,
      previewSec,
      isPreview,
      rate,
      volume,
      muted,
      lang,
      notice,
      noVoice,
      speechLang,
      errorMessage,
      backend,
      offline,
      playSite,
      playExhibit,
      toggle,
      pause,
      resume,
      stop,
      seek,
      skip,
      setRate,
      setVolume,
      toggleMute,
      unlock,
      isCurrent
    ]
  );

  return <NarrationContext.Provider value={value}>{children}</NarrationContext.Provider>;
};

export function useNarration(): NarrationContextValue {
  const ctx = useContext(NarrationContext);
  if (!ctx) throw new Error('useNarration() must be used inside <NarrationProvider>');
  return ctx;
}

export function useOptionalNarration(): NarrationContextValue | null {
  return useContext(NarrationContext);
}
