// Engine phát thuyết minh có thể tua (seekable) với 2 backend chung một giao diện:
//   - AudioElementBackend: file mp3 thật (audioUrl) qua HTMLAudioElement.
//   - TtsBackend: Web Speech API, chia câu + dòng thời gian ước lượng để tua được.
//     Nếu thiết bị không có giọng đọc phù hợp -> chạy đồng hồ im lặng (silent) để UI vẫn hoạt động.
import type { LanguageCode } from '../types';

// ---------------------------------------------------------------------------
// Phần thuần (pure) – dùng chung & kiểm thử được bằng node
// ---------------------------------------------------------------------------
export const MAX_CHUNK_CHARS = 200;
/** ko/ja/zh: một ký tự chứa nhiều âm hơn -> đoạn ngắn hơn (≈ 20–25 giây đọc). */
export const MAX_CHUNK_CHARS_CJK = 100;
/** Trọng số (tính theo ký tự) cho khoảng nghỉ giữa các câu. */
export const PAUSE_WEIGHT = 6;
/** ko/ja/zh: mỗi ký tự ≈ 0,2 giây nên khoảng nghỉ tương đương ~2 ký tự. */
export const PAUSE_WEIGHT_CJK = 2;

/** BCP-47 dùng cho utterance.lang. */
export const SPEECH_LANG: Record<LanguageCode, string> = {
  vi: 'vi-VN',
  en: 'en-US',
  ko: 'ko-KR',
  ja: 'ja-JP',
  zh: 'zh-CN'
};

export const isCjkLang = (lang?: LanguageCode | null): boolean => lang === 'ko' || lang === 'ja' || lang === 'zh';

export interface TimelineChunk {
  text: string;
  /** Mốc bắt đầu trên dòng thời gian (giây, ở tốc độ 1.0). */
  start: number;
  /** Độ dài ước lượng (giây, ở tốc độ 1.0). */
  dur: number;
}

export interface Timeline {
  chunks: TimelineChunk[];
  /** Tổng độ dài mà văn bản phủ lên dòng thời gian. */
  span: number;
  /** Trọng số nghỉ cuối đoạn (ký tự) đã dùng khi dựng dòng thời gian. */
  pauseWeight?: number;
}

function splitByWords(text: string, maxLen: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of text.split(' ')) {
    if (!w) continue;
    if (w.length > maxLen) {
      // "Từ" dài không có khoảng trắng (tiếng Nhật/Trung) -> cắt theo ký tự
      if (cur) out.push(cur);
      cur = '';
      for (let i = 0; i < w.length; i += maxLen) out.push(w.slice(i, i + maxLen));
      continue;
    }
    if (cur && cur.length + 1 + w.length > maxLen) {
      out.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + ' ' + w : w;
    }
  }
  if (cur) out.push(cur);
  return out;
}

const CJK_CLOSERS = '"\'”’)]」』）】》';

/**
 * Tách câu cho ko/ja/zh: kết thúc ở 。！？．!?；; … (không cần khoảng trắng phía sau) và ở "." khi
 * theo sau là khoảng trắng / hết chuỗi (tiếng Hàn dùng dấu chấm Latin; giữ nguyên số thập phân 5.5).
 * Không tách khi đang ở trong ngoặc 「」『』（）《》“”.
 */
function splitCjkSentences(t: string): string[] {
  const hard = '。！？．!?；;…';
  const out: string[] = [];
  let cur = '';
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    cur += ch;
    if ('「『（《“'.includes(ch)) depth++;
    else if ('」』）》”'.includes(ch) && depth > 0) depth--;
    if (depth > 0 && cur.length < 160) continue;
    const next = t[i + 1];
    const end = hard.includes(ch) || (ch === '.' && (next === undefined || next === ' ' || CJK_CLOSERS.includes(next) || next === '.'));
    if (!end) continue;
    while (i + 1 < t.length && (hard.includes(t[i + 1]) || t[i + 1] === '.' || CJK_CLOSERS.includes(t[i + 1]))) {
      const c = t[++i];
      cur += c;
      if ('」』）》”'.includes(c) && depth > 0) depth--;
    }
    if (cur.trim()) out.push(cur.trim());
    cur = '';
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Gộp các phần nhỏ thành đoạn ≤ maxLen (joiner: ' ' cho chữ Latin/Hàn, '' cho Nhật/Trung). */
function packParts(parts: string[], maxLen: number, joiner: string, out: string[]) {
  let cur = '';
  for (const p of parts) {
    if (!p) continue;
    if (p.length > maxLen) {
      if (cur) {
        out.push(cur);
        cur = '';
      }
      out.push(...splitByWords(p, maxLen));
      continue;
    }
    if (cur && cur.length + joiner.length + p.length > maxLen) {
      out.push(cur);
      cur = p;
    } else {
      cur = cur ? cur + joiner + p : p;
    }
  }
  if (cur) out.push(cur);
}

/**
 * Chia văn bản thành các đoạn ≤ maxLen ký tự: theo câu, câu dài thì theo dấu phẩy, sau cùng theo từ/ký tự.
 * - vi/en: câu kết thúc ở . ! ? … ; : đứng trước khoảng trắng (tránh "1.969", "8:30"); phẩy ", ".
 * - ko/ja/zh: câu kết thúc ở 。！？．!?；（không cần khoảng trắng）; câu dài tách sau ，、, .
 */
export function splitIntoChunks(text: string, maxLen?: number, lang?: LanguageCode): string[] {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const cjk = isCjkLang(lang) || /[。！？．；，、]/.test(clean);
  const max = maxLen || (cjk ? MAX_CHUNK_CHARS_CJK : MAX_CHUNK_CHARS);
  const out: string[] = [];
  if (!cjk) {
    const sentences = clean.split(/(?<=[.!?…;:]["'”’)\]]*)\s+/);
    for (const s of sentences) {
      if (!s) continue;
      if (s.length <= max) out.push(s);
      else packParts(s.split(/(?<=[,，])\s+/), max, ' ', out);
    }
    return out;
  }
  const noSpaceScript = lang === 'ja' || lang === 'zh' || (!lang && !/\s/.test(clean));
  for (const s of splitCjkSentences(clean)) {
    if (s.length <= max) {
      out.push(s);
      continue;
    }
    // Tách sau ，、 (không cần khoảng trắng) hoặc ", " (tiếng Hàn)
    const parts = s.split(/(?<=[，、])|(?<=,)\s+/).map((x) => x.trim()).filter(Boolean);
    packParts(parts, max, noSpaceScript ? '' : ' ', out);
  }
  return out;
}

/** Dựng dòng thời gian: độ dài mỗi đoạn tỉ lệ với số ký tự (+ khoảng nghỉ), tổng = spanSec. */
export function buildTimeline(chunks: string[], spanSec: number, lang?: LanguageCode): Timeline {
  const pause = isCjkLang(lang) ? PAUSE_WEIGHT_CJK : PAUSE_WEIGHT;
  const weights = chunks.map((c) => c.length + pause);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const span = Math.max(0, spanSec || 0);
  let cum = 0;
  const out: TimelineChunk[] = chunks.map((text, i) => {
    const start = (span * cum) / total;
    cum += weights[i];
    return { text, start, dur: (span * cum) / total - start };
  });
  return { chunks: out, span, pauseWeight: pause };
}

/** Chỉ số đoạn chứa mốc t (giây). */
export function findChunkIndex(tl: Timeline, t: number): number {
  const cs = tl.chunks;
  if (!cs.length) return -1;
  if (t <= 0) return 0;
  let lo = 0;
  let hi = cs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cs[mid].start <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Thời lượng (giây) cho mỗi ký tự trong đoạn – phần nghỉ cuối câu không chứa ký tự. */
function secPerChar(chunk: TimelineChunk, pauseWeight: number = PAUSE_WEIGHT): number {
  return chunk.dur / (chunk.text.length + pauseWeight);
}

/** Cắt đoạn tại mốc t, lùi về đầu từ gần nhất. Trả về phần văn bản còn lại và mốc thời gian thật của nó. */
export function sliceChunkAt(
  chunk: TimelineChunk,
  t: number,
  pauseWeight: number = PAUSE_WEIGHT
): { text: string; offset: number; start: number } {
  const len = chunk.text.length;
  const spc = secPerChar(chunk, pauseWeight);
  const idx = spc > 0 ? Math.min(len, Math.max(0, Math.floor((t - chunk.start) / spc))) : 0;
  if (idx <= 0) return { text: chunk.text, offset: 0, start: chunk.start };
  const sp = chunk.text.lastIndexOf(' ', idx - 1);
  let offset = sp < 0 ? 0 : sp + 1;
  // Tiếng Nhật/Trung không có khoảng trắng: lùi về dấu ，、 gần nhất, nếu không có thì cắt đúng ký tự
  if (sp < 0 && !/\s/.test(chunk.text)) {
    const punct = Math.max(chunk.text.lastIndexOf('，', idx - 1), chunk.text.lastIndexOf('、', idx - 1));
    offset = punct >= 0 && idx - punct < 12 ? punct + 1 : Math.min(idx, len - 1);
  }
  return { text: chunk.text.slice(offset), offset, start: chunk.start + spc * offset };
}

/** Mốc thời gian ứng với vị trí ký tự charIndex trong đoạn. */
export function positionAtChar(chunk: TimelineChunk, charIndex: number, pauseWeight: number = PAUSE_WEIGHT): number {
  const c = Math.min(chunk.text.length, Math.max(0, charIndex));
  return chunk.start + secPerChar(chunk, pauseWeight) * c;
}

export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

// ---------------------------------------------------------------------------
// Giao diện engine
// ---------------------------------------------------------------------------
export type EngineState = 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'limit' | 'error';
export type EngineNotice = 'no-tts' | 'no-voice' | 'tts-error' | 'autoplay-blocked' | 'audio-error' | null;
export type BackendKind = 'audio' | 'tts' | 'silent';

export interface EngineSource {
  text: string;
  /** Độ dài ĐẦY ĐỦ của bài (giây) – dùng cho thanh tua. */
  durationSec: number;
  /** Điểm dừng bắt buộc (bản nghe thử) – null nếu được nghe trọn. */
  limitSec: number | null;
  /** Đoạn [0..textSpanSec] mà văn bản phủ lên (bản thử: previewSec, bản đầy đủ: durationSec). */
  textSpanSec: number;
  audioUrl: string | null;
  lang: LanguageCode;
}

export interface EngineOptions {
  rate: number;
  volume: number;
  muted: boolean;
  startAt?: number;
  autoplay?: boolean;
}

export interface EngineCallbacks {
  onTime: (sec: number) => void;
  onState: (state: EngineState) => void;
  onDuration?: (sec: number) => void;
  onNotice?: (notice: EngineNotice) => void;
  onBackend?: (kind: BackendKind) => void;
}

interface Backend {
  kind: BackendKind;
  prepare(): Promise<void>;
  play(): void;
  pause(): void;
  seek(t: number): number;
  setRate(r: number): void;
  setVolume(v: number, muted: boolean): void;
  destroy(): void;
  getPosition(): number;
  isPlaying(): boolean;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}
function isChromium(): boolean {
  return typeof navigator !== 'undefined' && /Chrome|Chromium|CriOS|Edg\//i.test(navigator.userAgent);
}

// ---------------------------------------------------------------------------
// Chọn giọng đọc
// ---------------------------------------------------------------------------
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

export function loadVoices(timeoutMs = 1800): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  const initial = synth.getVoices();
  if (initial && initial.length) return Promise.resolve(initial);
  if (voicesPromise) return voicesPromise;
  voicesPromise = new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try {
        synth.removeEventListener('voiceschanged', onChange);
      } catch {
        /* ignore */
      }
      const v = synth.getVoices() || [];
      if (!v.length) voicesPromise = null; // thử lại lần sau
      resolve(v);
    };
    const onChange = () => {
      if (synth.getVoices().length) finish();
    };
    try {
      synth.addEventListener('voiceschanged', onChange);
    } catch {
      /* ignore */
    }
    setTimeout(finish, timeoutMs);
  });
  return voicesPromise;
}

// ---------------------------------------------------------------------------
// Mở khoá âm thanh trong thao tác chạm (iOS Safari / WebKit)
// iOS bỏ qua speechSynthesis.speak() và audio.play() nếu lần đầu không nằm trong cử chỉ người dùng.
// Bài thuyết minh chỉ bắt đầu sau khi tải mạng (await) nên phải "mồi" đồng bộ ngay trong onClick.
// ---------------------------------------------------------------------------
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
let sharedAudio: HTMLAudioElement | null = null;
let ttsPrimed = false;
let audioPrimed = false;

export function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.setAttribute('playsinline', '');
  }
  return sharedAudio;
}

/** Gọi ĐỒNG BỘ bên trong trình xử lý click/tap, trước mọi await. An toàn khi gọi nhiều lần. */
export function primeAudio(): void {
  if (typeof window === 'undefined') return;
  if (!ttsPrimed && 'speechSynthesis' in window) {
    ttsPrimed = true;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }
  if (!audioPrimed) {
    audioPrimed = true;
    try {
      const a = getSharedAudio();
      if (!a.getAttribute('src')) {
        a.src = SILENT_WAV;
        const p = a.play();
        if (p && typeof p.catch === 'function') p.catch(() => undefined);
      }
    } catch {
      /* ignore */
    }
  }
}

/** Nạp sẵn danh sách giọng đọc khi khởi động để lần bấm đầu không phải chờ. */
export function warmUpVoices(): void {
  void loadVoices().catch(() => undefined);
}

/** Ưu tiên giọng tự nhiên (Google / Microsoft Natural / Apple) theo từng ngôn ngữ. */
const VOICE_PREFS: Record<LanguageCode, Array<[string, number]>> = {
  vi: [
    ['hoaimy', 7],
    ['namminh', 6],
    ['google', 5],
    ['microsoft an', 4],
    ['linh', 3],
    ['natural', 3],
    ['online', 2]
  ],
  en: [
    ['google us english', 7],
    ['aria', 6],
    ['jenny', 6],
    ['natural', 4],
    ['google', 4],
    ['samantha', 3],
    ['online', 2]
  ],
  ko: [
    ['google 한국의', 8],
    ['google 한국어', 8],
    ['sunhi', 7],
    ['injoon', 6],
    ['yuna', 4],
    ['google', 4],
    ['natural', 3],
    ['online', 2],
    ['heami', 1]
  ],
  ja: [
    ['google 日本語', 8],
    ['nanami', 7],
    ['keita', 6],
    ['kyoko', 4],
    ['google', 4],
    ['ayumi', 3],
    ['haruka', 3],
    ['natural', 3],
    ['online', 2],
    ['ichiro', 1]
  ],
  zh: [
    ['google 普通话', 8],
    ['google 普通話', 8],
    ['xiaoxiao', 7],
    ['yunxi', 6],
    ['tingting', 4],
    ['google', 4],
    ['huihui', 3],
    ['kangkang', 3],
    ['natural', 3],
    ['online', 2],
    ['yaoyao', 1]
  ]
};

const normVoiceLang = (s: string) => (s || '').toLowerCase().replace(/_/g, '-');

/** Giọng có thuộc ngôn ngữ lang không (zh: cả zh-CN/zh-TW/cmn-*, ko: ko-KR/kor, ...). */
function voiceMatches(v: SpeechSynthesisVoice, lang: LanguageCode): boolean {
  const l = normVoiceLang(v.lang);
  if (l.startsWith(lang + '-') || l === lang) return true;
  if (lang === 'zh') return l.startsWith('cmn');
  if (lang === 'ko') return l.startsWith('kor');
  if (lang === 'ja') return l.startsWith('jpn');
  if (lang === 'vi') return l.startsWith('vie');
  return false;
}

export function pickVoice(voices: SpeechSynthesisVoice[], lang: LanguageCode): SpeechSynthesisVoice | null {
  const cands = voices.filter((v) => voiceMatches(v, lang));
  if (!cands.length) return null;
  const prefs = VOICE_PREFS[lang] || [];
  const exact = SPEECH_LANG[lang].toLowerCase();
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;
  for (const v of cands) {
    const name = v.name.toLowerCase();
    const vl = normVoiceLang(v.lang);
    let score = 0;
    for (const [k, w] of prefs) if (name.includes(k.toLowerCase())) score += w;
    if (vl === exact) score += 2;
    // Tiếng Trung: ưu tiên phổ thông giản thể; tránh giọng Quảng Đông / phồn thể
    if (lang === 'zh') {
      if (/hk|yue|cantonese|粤|粵/.test(vl + ' ' + name)) score -= 6;
      else if (/tw|hant/.test(vl)) score -= 3;
    }
    if (v.default) score += 0.5;
    if (score > bestScore) {
      best = v;
      bestScore = score;
    }
  }
  return best;
}

/** Thiết bị có giọng đọc cho ngôn ngữ này không (null = không xác định, vd. Android không liệt kê giọng). */
export async function hasVoiceFor(lang: LanguageCode): Promise<boolean | null> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  const voices = await loadVoices();
  if (!voices.length) return null;
  return !!pickVoice(voices, lang);
}

// ---------------------------------------------------------------------------
// TTS backend (kèm chế độ đồng hồ im lặng)
// ---------------------------------------------------------------------------
class TtsBackend implements Backend {
  kind: BackendKind = 'tts';
  private tl: Timeline;
  private src: EngineSource;
  private cb: EngineCallbacks;
  private rate = 1;
  private volume = 1;
  private muted = false;
  private voice: SpeechSynthesisVoice | null = null;
  private noVoice = false;
  private gen = 0;
  private playing = false;
  private segIndex = 0;
  private segOffset = 0;
  private segEnd = 0;
  private started = false;
  private holdSince = 0;
  private baseSec = 0;
  private baseTime = 0;
  private pos = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private keepAlive: ReturnType<typeof setInterval> | null = null;
  private volTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private speakTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(src: EngineSource, opts: EngineOptions, cb: EngineCallbacks, forceSilent = false) {
    this.src = src;
    this.cb = cb;
    this.rate = opts.rate || 1;
    this.volume = opts.volume ?? 1;
    this.muted = !!opts.muted;
    this.tl = buildTimeline(splitIntoChunks(src.text, undefined, src.lang), src.textSpanSec, src.lang);
    if (forceSilent) this.kind = 'silent';
  }

  private get synth(): SpeechSynthesis | null {
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  }

  private get stopAt(): number {
    return this.src.limitSec != null ? Math.min(this.src.limitSec, this.src.durationSec) : this.src.durationSec;
  }

  async prepare(): Promise<void> {
    if (this.kind === 'silent') return;
    if (!this.synth || typeof SpeechSynthesisUtterance === 'undefined') {
      this.goSilent('no-tts');
      return;
    }
    const voices = await loadVoices();
    if (!voices.length) {
      // Android đôi khi không liệt kê giọng nhưng vẫn đọc được theo utterance.lang
      this.voice = null;
      return;
    }
    this.voice = pickVoice(voices, this.src.lang);
    if (!this.voice) {
      // Không có giọng cho ngôn ngữ này: vẫn đọc với utterance.lang (trình duyệt có thể tự chọn giọng),
      // báo 'no-voice' để UI hiện "Thiết bị chưa có giọng đọc …"; dòng thời gian không chạy nhanh hơn đồng hồ.
      this.noVoice = true;
      this.cb.onNotice?.('no-voice');
    }
  }

  /** true khi thiết bị không có giọng đọc cho ngôn ngữ của bài. */
  get missingVoice(): boolean {
    return this.noVoice;
  }

  private goSilent(notice: EngineNotice) {
    const wasSpeaking = this.kind !== 'silent';
    this.kind = 'silent';
    if (wasSpeaking && this.synth) {
      try {
        this.synth.cancel();
      } catch {
        /* ignore */
      }
    }
    this.clearKeepAlive();
    // Giữ thông báo "chưa có giọng đọc" nếu nguyên nhân lỗi là thiếu giọng
    this.cb.onNotice?.(this.noVoice ? 'no-voice' : notice);
    this.cb.onBackend?.('silent');
    if (this.playing) this.setClock(this.currentPos());
  }

  getPosition(): number {
    return this.playing ? this.currentPos() : this.pos;
  }
  isPlaying(): boolean {
    return this.playing;
  }

  private currentPos(): number {
    if (!this.playing) return this.pos;
    let p = this.baseSec + ((now() - this.baseTime) / 1000) * this.rate;
    // Khi đang đọc thật: không vượt quá cuối đoạn cho tới khi onend
    if (this.kind === 'tts' && this.segEnd > 0) p = Math.min(p, Math.max(this.baseSec, this.segEnd - 0.05));
    return Math.min(p, this.stopAt);
  }

  private setClock(p: number) {
    this.baseSec = p;
    this.baseTime = now();
    this.pos = p;
    this.holdSince = 0;
  }

  play(): void {
    if (this.playing) return;
    if (this.pos >= this.stopAt - 0.05) {
      this.finish();
      return;
    }
    this.playing = true;
    this.cb.onState('playing');
    this.startFrom(this.pos);
    this.startTimer();
  }

  pause(): void {
    if (!this.playing) return;
    this.pos = this.currentPos();
    this.playing = false;
    this.gen++;
    this.cancelSpeech();
    this.stopTimer();
    this.cb.onTime(this.pos);
    this.cb.onState('paused');
  }

  seek(t: number): number {
    const c = Math.max(0, Math.min(t, this.stopAt));
    if (this.playing) {
      this.startFrom(c);
    } else {
      this.pos = c;
    }
    this.cb.onTime(c);
    return c;
  }

  setRate(r: number): void {
    const p = this.currentPos();
    this.rate = r || 1;
    if (this.playing) this.startFrom(p);
  }

  setVolume(v: number, muted: boolean): void {
    this.volume = v;
    this.muted = muted;
    if (!this.playing || this.kind === 'silent') return;
    // utterance.volume cố định -> phát lại từ vị trí hiện tại (debounce khi kéo thanh)
    if (this.volTimer) clearTimeout(this.volTimer);
    this.volTimer = setTimeout(() => {
      if (this.playing) this.startFrom(this.currentPos());
    }, 280);
  }

  destroy(): void {
    this.gen++;
    this.playing = false;
    this.cancelSpeech();
    this.stopTimer();
    if (this.volTimer) clearTimeout(this.volTimer);
  }

  // ----- nội bộ -----
  private cancelSpeech() {
    if (this.watchdog) clearTimeout(this.watchdog);
    if (this.speakTimer) clearTimeout(this.speakTimer);
    this.watchdog = null;
    this.speakTimer = null;
    this.clearKeepAlive();
    if (this.kind === 'tts' && this.synth) {
      try {
        this.synth.cancel();
      } catch {
        /* ignore */
      }
    }
  }

  private startFrom(t: number) {
    this.gen++;
    this.cancelSpeech();
    this.setClock(t);
    if (t >= this.tl.span - 0.05 || !this.tl.chunks.length) {
      // Văn bản đã hết (vd. bản thử đọc xong) – đồng hồ chạy tiếp tới điểm dừng
      this.segEnd = 0;
      this.segIndex = this.tl.chunks.length;
      if (this.kind === 'tts') this.segEnd = this.stopAt + 1; // không giữ đồng hồ
      return;
    }
    const idx = findChunkIndex(this.tl, t);
    const slice = sliceChunkAt(this.tl.chunks[idx], t, this.tl.pauseWeight);
    this.speakSegment(idx, slice.text, slice.offset, true);
  }

  private speakSegment(idx: number, text: string, offset: number, afterCancel: boolean) {
    const chunk = this.tl.chunks[idx];
    this.segIndex = idx;
    this.segOffset = offset;
    this.segEnd = chunk.start + chunk.dur;
    this.started = false;
    if (this.kind !== 'tts' || !this.synth) return;
    const g = this.gen;
    const synth = this.synth;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LANG[this.src.lang] || 'vi-VN';
    if (this.voice) u.voice = this.voice;
    u.rate = this.rate;
    u.volume = this.muted ? 0 : Math.max(0, Math.min(1, this.volume));
    u.onstart = () => {
      if (g !== this.gen) return;
      this.started = true;
    };
    u.onboundary = (e: SpeechSynthesisEvent) => {
      if (g !== this.gen || !this.playing) return;
      if (e.name && e.name !== 'word') return;
      const p = positionAtChar(chunk, offset + (e.charIndex || 0), this.tl.pauseWeight);
      if (Math.abs(p - this.currentPos()) > 0.4) this.setClock(p);
    };
    u.onend = () => {
      if (g !== this.gen || !this.playing) return;
      if (this.noVoice) {
        // Giọng mặc định có thể bỏ qua chữ không đọc được -> chờ đồng hồ tới cuối đoạn
        const real = this.baseSec + ((now() - this.baseTime) / 1000) * this.rate;
        const wait = ((this.segEnd - real) / this.rate) * 1000;
        if (wait > 250) {
          this.speakTimer = setTimeout(() => {
            if (g === this.gen && this.playing) this.next(idx + 1);
          }, wait);
          return;
        }
      }
      this.next(idx + 1);
    };
    u.onerror = (e: SpeechSynthesisErrorEvent) => {
      if (g !== this.gen) return;
      const err = e && e.error;
      if (err === 'interrupted' || err === 'canceled') return;
      if (err === 'not-allowed') {
        // Trình duyệt chặn tự phát khi chưa có thao tác người dùng
        this.pos = this.currentPos();
        this.playing = false;
        this.gen++;
        this.stopTimer();
        this.cb.onNotice?.('autoplay-blocked');
        this.cb.onState('paused');
        return;
      }
      this.goSilent('tts-error');
    };
    const doSpeak = () => {
      if (g !== this.gen) return;
      try {
        synth.speak(u);
        if (synth.paused) synth.resume();
      } catch {
        this.goSilent('tts-error');
        return;
      }
      this.startKeepAlive();
      // Watchdog: không có onstart sau 6s -> chuyển sang đồng hồ im lặng
      if (this.watchdog) clearTimeout(this.watchdog);
      this.watchdog = setTimeout(() => {
        if (g !== this.gen || !this.playing) return;
        if (!this.started && !synth.speaking) this.goSilent('tts-error');
      }, 6000);
    };
    // Chrome: speak() ngay sau cancel() đôi khi bị nuốt -> trễ một nhịp
    if (afterCancel) this.speakTimer = setTimeout(doSpeak, 60);
    else doSpeak();
  }

  private next(i: number) {
    if (i >= this.tl.chunks.length) {
      this.setClock(Math.max(this.currentPos(), this.tl.span));
      this.segEnd = this.stopAt + 1;
      if (this.tl.span >= this.stopAt - 0.05) this.finish();
      return;
    }
    this.setClock(this.tl.chunks[i].start);
    this.speakSegment(i, this.tl.chunks[i].text, 0, false);
  }

  private finish() {
    this.gen++;
    this.cancelSpeech();
    this.stopTimer();
    this.playing = false;
    this.pos = this.stopAt;
    this.cb.onTime(this.pos);
    this.cb.onState(this.src.limitSec != null && this.src.limitSec < this.src.durationSec ? 'limit' : 'ended');
  }

  private startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => this.tick(), 100);
  }
  private stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick() {
    if (!this.playing) return;
    const p = this.currentPos();
    if (p >= this.stopAt - 0.02) {
      this.finish();
      return;
    }
    if (this.kind === 'silent') {
      // Cập nhật đoạn hiện tại theo đồng hồ
      while (this.segIndex < this.tl.chunks.length - 1 && p >= this.segEnd) {
        this.segIndex++;
        const c = this.tl.chunks[this.segIndex];
        this.segEnd = c.start + c.dur;
      }
    } else if (this.segIndex < this.tl.chunks.length && p >= this.segEnd - 0.06) {
      // Đang "giữ" ở cuối đoạn chờ onend; nếu kẹt quá lâu (lỗi Chrome) thì sang đoạn kế
      if (!this.holdSince) this.holdSince = now();
      const chunk = this.tl.chunks[this.segIndex];
      const limit = Math.max(6000, (chunk.dur / this.rate) * 1000);
      if (now() - this.holdSince > limit) {
        const i = this.segIndex + 1;
        this.gen++;
        this.cancelSpeech();
        const g = this.gen;
        this.speakTimer = setTimeout(() => {
          if (g === this.gen && this.playing) this.next(i);
        }, 60);
        this.holdSince = 0;
      }
    }
    this.cb.onTime(p);
  }

  private startKeepAlive() {
    this.clearKeepAlive();
    // Chrome desktop + giọng online bị cắt sau ~15s -> pause/resume định kỳ
    if (!isChromium() || isAndroid() || !this.voice || this.voice.localService) return;
    const synth = this.synth;
    if (!synth) return;
    this.keepAlive = setInterval(() => {
      if (!this.playing || !synth.speaking) return;
      try {
        synth.pause();
        synth.resume();
      } catch {
        /* ignore */
      }
    }, 10000);
  }
  private clearKeepAlive() {
    if (this.keepAlive) clearInterval(this.keepAlive);
    this.keepAlive = null;
  }
}

// ---------------------------------------------------------------------------
// Audio element backend (mp3)
// ---------------------------------------------------------------------------
class AudioElementBackend implements Backend {
  kind: BackendKind = 'audio';
  private audio: HTMLAudioElement;
  private src: EngineSource;
  private cb: EngineCallbacks;
  private onFail: (pos: number, wasPlaying: boolean) => void;
  private duration: number;
  private pendingSeek: number | null = null;
  private playing = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private failed = false;

  constructor(
    src: EngineSource,
    opts: EngineOptions,
    cb: EngineCallbacks,
    onFail: (pos: number, wasPlaying: boolean) => void
  ) {
    this.src = src;
    this.cb = cb;
    this.onFail = onFail;
    this.duration = src.durationSec;
    // Dùng chung một thẻ <audio> đã được "mở khoá" trong thao tác chạm (iOS Safari)
    const a = getSharedAudio();
    a.preload = 'auto';
    a.playbackRate = opts.rate || 1;
    a.volume = Math.max(0, Math.min(1, opts.volume ?? 1));
    a.muted = !!opts.muted;
    this.audio = a;
    a.addEventListener('loadedmetadata', this.onMeta);
    a.addEventListener('timeupdate', this.onTimeUpdate);
    a.addEventListener('ended', this.onEnded);
    a.addEventListener('error', this.onError);
    a.addEventListener('pause', this.onPauseEvt);
    a.src = src.audioUrl as string;
  }

  private get stopAt(): number {
    return this.src.limitSec != null ? Math.min(this.src.limitSec, this.duration) : this.duration;
  }

  prepare(): Promise<void> {
    return new Promise((resolve) => {
      const a = this.audio;
      if (a.readyState >= 1) return resolve();
      const done = () => {
        a.removeEventListener('loadedmetadata', done);
        a.removeEventListener('error', done);
        resolve();
      };
      a.addEventListener('loadedmetadata', done);
      a.addEventListener('error', done);
      setTimeout(done, 4000);
    });
  }

  private onMeta = () => {
    const d = this.audio.duration;
    if (isFinite(d) && d > 0) {
      this.duration = d;
      this.cb.onDuration?.(d);
    }
    if (this.pendingSeek != null) {
      try {
        this.audio.currentTime = this.pendingSeek;
      } catch {
        /* ignore */
      }
      this.pendingSeek = null;
    }
  };
  private onTimeUpdate = () => this.check();
  private onEnded = () => {
    this.stopTimer();
    this.playing = false;
    this.cb.onTime(this.duration);
    this.cb.onState('ended');
  };
  private onError = () => {
    if (this.failed) return;
    this.failed = true;
    const wasPlaying = this.playing;
    const p = this.getPosition();
    this.destroy();
    this.onFail(p, wasPlaying);
  };
  private onPauseEvt = () => {
    // Bị hệ thống dừng (vd. tai nghe rút ra)
    if (this.playing && !this.audio.ended) {
      this.playing = false;
      this.stopTimer();
      this.cb.onState('paused');
    }
  };

  private check() {
    const p = this.getPosition();
    if (this.src.limitSec != null && p >= this.stopAt - 0.05 && this.stopAt < this.duration) {
      this.playing = false;
      this.audio.pause();
      this.stopTimer();
      try {
        this.audio.currentTime = this.stopAt;
      } catch {
        /* ignore */
      }
      this.cb.onTime(this.stopAt);
      this.cb.onState('limit');
      return;
    }
    if (this.playing) this.cb.onTime(p);
  }

  getPosition(): number {
    if (this.pendingSeek != null) return this.pendingSeek;
    return this.audio.currentTime || 0;
  }
  isPlaying(): boolean {
    return this.playing;
  }

  play(): void {
    if (this.playing || this.failed) return;
    if (this.getPosition() >= this.stopAt - 0.05) {
      this.cb.onTime(this.stopAt);
      this.cb.onState(this.stopAt < this.duration ? 'limit' : 'ended');
      return;
    }
    this.playing = true;
    this.cb.onState('playing');
    this.startTimer();
    const pr = this.audio.play();
    if (pr && typeof pr.catch === 'function') {
      pr.catch((err: any) => {
        if (this.failed) return;
        this.playing = false;
        this.stopTimer();
        if (err && err.name === 'NotAllowedError') {
          this.cb.onNotice?.('autoplay-blocked');
          this.cb.onState('paused');
        } else if (err && err.name !== 'AbortError') {
          this.onError();
        }
      });
    }
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    this.audio.pause();
    this.stopTimer();
    this.cb.onTime(this.getPosition());
    this.cb.onState('paused');
  }

  seek(t: number): number {
    const c = Math.max(0, Math.min(t, this.stopAt));
    if (this.audio.readyState >= 1) {
      try {
        this.audio.currentTime = c;
      } catch {
        this.pendingSeek = c;
      }
    } else {
      this.pendingSeek = c;
    }
    this.cb.onTime(c);
    return c;
  }

  setRate(r: number): void {
    this.audio.playbackRate = r || 1;
  }
  setVolume(v: number, muted: boolean): void {
    this.audio.volume = Math.max(0, Math.min(1, v));
    this.audio.muted = muted;
  }

  destroy(): void {
    this.playing = false;
    this.stopTimer();
    const a = this.audio;
    a.removeEventListener('loadedmetadata', this.onMeta);
    a.removeEventListener('timeupdate', this.onTimeUpdate);
    a.removeEventListener('ended', this.onEnded);
    a.removeEventListener('error', this.onError);
    a.removeEventListener('pause', this.onPauseEvt);
    try {
      a.pause();
      a.removeAttribute('src');
      a.load();
    } catch {
      /* ignore */
    }
  }

  private startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => this.check(), 150);
  }
  private stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

// ---------------------------------------------------------------------------
// Facade
// ---------------------------------------------------------------------------
export class NarrationEngine {
  private backend: Backend | null = null;
  private cb: EngineCallbacks;
  private loadGen = 0;
  private wantPlay = false;
  private ready = false;
  private opts: EngineOptions = { rate: 1, volume: 1, muted: false };

  constructor(cb: EngineCallbacks) {
    this.cb = cb;
  }

  get kind(): BackendKind | null {
    return this.backend ? this.backend.kind : null;
  }

  get position(): number {
    return this.backend ? this.backend.getPosition() : 0;
  }

  async load(src: EngineSource, opts: EngineOptions): Promise<void> {
    const g = ++this.loadGen;
    this.unload();
    this.opts = { rate: opts.rate, volume: opts.volume, muted: opts.muted };
    this.wantPlay = !!opts.autoplay;
    this.ready = false;
    this.cb.onNotice?.(null);
    this.cb.onState('loading');
    const wrapped: EngineCallbacks = {
      onTime: (s) => g === this.loadGen && this.cb.onTime(s),
      onState: (s) => g === this.loadGen && this.cb.onState(s),
      onDuration: (d) => g === this.loadGen && this.cb.onDuration?.(d),
      onNotice: (n) => g === this.loadGen && this.cb.onNotice?.(n),
      onBackend: (k) => g === this.loadGen && this.cb.onBackend?.(k)
    };
    let backend: Backend;
    if (src.audioUrl) {
      backend = new AudioElementBackend(src, this.opts, wrapped, (pos, wasPlaying) => {
        if (g !== this.loadGen) return;
        // mp3 lỗi -> dùng giọng đọc TTS
        this.cb.onNotice?.('audio-error');
        if (!src.text) {
          this.cb.onState('error');
          return;
        }
        const tts = new TtsBackend({ ...src, audioUrl: null }, this.opts, wrapped);
        this.backend = tts;
        tts.prepare().then(() => {
          if (g !== this.loadGen) return;
          this.ready = true;
          this.cb.onBackend?.(tts.kind);
          tts.seek(pos);
          if (wasPlaying || this.wantPlay) tts.play();
          else this.cb.onState('paused');
        });
      });
    } else {
      backend = new TtsBackend(src, this.opts, wrapped);
    }
    this.backend = backend;
    await backend.prepare();
    if (g !== this.loadGen || this.backend !== backend) return;
    this.ready = true;
    this.cb.onBackend?.(backend.kind);
    if (opts.startAt && opts.startAt > 0) backend.seek(opts.startAt);
    else this.cb.onTime(0);
    this.cb.onState('ready');
    if (this.wantPlay) backend.play();
  }

  play(): void {
    this.wantPlay = true;
    if (this.backend && this.ready) this.backend.play();
  }
  pause(): void {
    this.wantPlay = false;
    if (this.backend) this.backend.pause();
  }
  seek(t: number): number {
    return this.backend ? this.backend.seek(t) : 0;
  }
  isPlaying(): boolean {
    return !!this.backend && this.backend.isPlaying();
  }
  setRate(r: number): void {
    this.opts.rate = r;
    this.backend?.setRate(r);
  }
  setVolume(v: number, muted: boolean): void {
    this.opts.volume = v;
    this.opts.muted = muted;
    this.backend?.setVolume(v, muted);
  }
  unload(): void {
    if (this.backend) this.backend.destroy();
    this.backend = null;
    this.ready = false;
  }
  destroy(): void {
    this.loadGen++;
    this.unload();
  }
}
