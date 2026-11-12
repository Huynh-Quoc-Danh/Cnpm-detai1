// Narration text helpers: unit counting, spoken-duration estimate and preview extraction.
// Speech rates (rate 1.0 of Web Speech / typical TTS):
//   vi  counts syllables (space-separated words)  ~165 per minute
//   en  counts words                              ~150 per minute
//   ko  counts Hangul syllables / non-space chars ~300 per minute
//   ja  counts characters (kana + kanji)          ~340 per minute
//   zh  counts Han characters                     ~250 per minute
// For ko/ja/zh, whitespace and punctuation are not counted.
export const LANGS = ['vi', 'en', 'ko', 'ja', 'zh'];
export const CJK_LANGS = ['ko', 'ja', 'zh'];
export const UNITS_PER_MINUTE = { vi: 165, en: 150, ko: 300, ja: 340, zh: 250 };
/** @deprecated kept for older imports */
export const WORDS_PER_MINUTE = UNITS_PER_MINUTE;

/** 'vi' | 'en' | 'ko' | 'ja' | 'zh' – anything else -> 'vi'. */
export const normLang = (v) => {
  const l = String(v || '').trim().toLowerCase().slice(0, 2);
  return LANGS.includes(l) ? l : 'vi';
};

export const isCjkLang = (lang) => CJK_LANGS.includes(lang);

// Whitespace + Unicode punctuation/symbols (incl. CJK 。、，！？「」『』（）・…).
const NON_COUNTED = /[\s\p{P}\p{S}]/gu;

/** Character count excluding whitespace and punctuation (used for ko/ja/zh). */
export function countChars(text) {
  if (!text) return 0;
  return String(text).replace(NON_COUNTED, '').length;
}

export function countWords(text) {
  if (!text) return 0;
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

/** Speech units for the language: words for vi/en, characters for ko/ja/zh. */
export function countUnits(text, lang = 'vi') {
  return isCjkLang(lang) ? countChars(text) : countWords(text);
}

export function estimateDurationSec(text, lang = 'vi') {
  const units = countUnits(text, lang);
  if (!units) return 0;
  const rate = UNITS_PER_MINUTE[lang] || UNITS_PER_MINUTE.vi;
  return Math.max(1, Math.round((units / rate) * 60));
}

/**
 * Sentence split for every language. Sentence ends: 。！？．!?；; … and "." when followed by a space or
 * the end (so decimals like 5.5 stay intact). ";" / "；" only end sentences for ko/ja/zh.
 * Closing quotes/brackets stay with their sentence.
 */
const CLOSERS = `"'”’)]」』）】`;
export function splitSentences(text, lang = 'vi') {
  if (!text) return [];
  const t = String(text).replace(/\s+/g, ' ').trim();
  const cjk = isCjkLang(lang) || /[。！？．；]/.test(t);
  const hard = cjk ? '。！？．!?；;…' : '!?…。！？';
  const out = [];
  let cur = '';
  let depth = 0; // inside 「」『』（）《》 quotes a "！" does not end the sentence
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    cur += ch;
    if (cjk && '「『（《“'.includes(ch)) depth++;
    else if (cjk && '」』）》”'.includes(ch) && depth > 0) depth--;
    if (depth > 0 && cur.length < 160) continue; // unbalanced quote safety
    const next = t[i + 1];
    const isEnd = hard.includes(ch) || (ch === '.' && (next === undefined || next === ' ' || CLOSERS.includes(next) || next === '.'));
    if (!isEnd) continue;
    // absorb repeated terminators and closing quotes
    while (i + 1 < t.length && (hard.includes(t[i + 1]) || t[i + 1] === '.' || CLOSERS.includes(t[i + 1]))) {
      const c = t[++i];
      cur += c;
      if ('」』）》”'.includes(c) && depth > 0) depth--;
    }
    out.push(cur.trim());
    cur = '';
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

/** Joins sentences the way the language writes them (no spaces for ja/zh). */
export function joinSentences(sentences, lang = 'vi') {
  return sentences.join(lang === 'ja' || lang === 'zh' ? '' : ' ');
}

/**
 * Leading sentences whose estimated speaking time totals ~previewSeconds.
 * Uses the same speaking rate as durationSec (units / durationSec, units = words for vi/en and
 * characters for ko/ja/zh) so that the preview ends close to previewSec on the client's timeline.
 * Always returns at least one sentence and never the whole text when it is longer than the preview.
 */
export function buildPreviewText(text, durationSec, previewSeconds, lang = 'vi') {
  const sentences = splitSentences(text, lang);
  if (!sentences.length) return '';
  const totalUnits = countUnits(text, lang);
  const dur = durationSec > 0 ? durationSec : estimateDurationSec(text, lang);
  if (dur <= previewSeconds) return joinSentences(sentences, lang);
  const unitsPerSec = totalUnits / dur;
  const budget = previewSeconds * unitsPerSec;
  const out = [];
  let used = 0;
  for (const s of sentences) {
    const w = countUnits(s, lang);
    if (out.length && used + w > budget * 1.15) break;
    out.push(s);
    used += w;
    if (used >= budget) break;
  }
  if (out.length === sentences.length && sentences.length > 1) out.pop();
  return joinSentences(out, lang);
}
