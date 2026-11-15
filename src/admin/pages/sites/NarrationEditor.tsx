// Soạn lời thuyết minh 1 ngôn ngữ (vi/en/ko/ja/zh): đếm từ hoặc ký tự, ước tính thời lượng, cảnh báo độ dài,
// nghe thử TTS, tải mp3.
import React, { useEffect, useState } from 'react';
import type { LanguageCode } from '../../../types';
import { Field, LangTag, TextArea } from '../../components/FormField';
import { AudioUpload } from '../../components/Uploads';
import { Badge } from '../../components/ui';
import { countTextUnits, cx, estimateSec, fmtClock, WORDS_PER_MIN } from '../../utils';
import { languageMeta, unitLabelVi } from '../../../i18n';
import { pickVoice, SPEECH_LANG } from '../../../services/narrationEngine';

const PLACEHOLDER: Record<LanguageCode, string> = {
  vi: 'Xin chào quý khách! Chào mừng quý khách đến với…',
  en: 'Hello and welcome to…',
  ko: '안녕하세요, 여러분! 하롱베이에 오신 것을 환영합니다…',
  ja: '皆さま、こんにちは。ハロン湾へようこそ…',
  zh: '各位游客，大家好！欢迎来到下龙湾……'
};

interface Props {
  lang: LanguageCode;
  text: string;
  onText: (t: string) => void;
  durationSec: number;
  onDuration: (sec: number) => void;
  audioUrl: string | null;
  onAudio: (url: string | null) => void;
  /** Khoảng thời lượng khuyến nghị (giây) */
  target: [number, number];
  previewSec?: number;
  rows?: number;
}

export const NarrationEditor: React.FC<Props> = ({ lang, text, onText, durationSec, onDuration, audioUrl, onAudio, target, previewSec, rows = 12 }) => {
  const words = countTextUnits(text, lang);
  const unit = unitLabelVi(lang);
  const est = estimateSec(text, lang);
  const [speaking, setSpeaking] = useState(false);
  const fromAudio = !!audioUrl;
  // Ưu tiên thời lượng đã lưu (đồng bộ với tab ngôn ngữ & ứng dụng khách); khi sửa văn bản sẽ cập nhật theo ước tính
  const shown = fromAudio || durationSec > 0 ? durationSec : est;
  const status = !text.trim() ? 'empty' : shown < target[0] ? 'short' : shown > target[1] ? 'long' : 'ok';

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const speak = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LANG[lang];
    const voice = pickVoice(synth.getVoices(), lang);
    if (voice) u.voice = voice;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  };

  const fmtTarget = `${fmtClock(target[0])}–${fmtClock(target[1])}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <Field
        label={
          <>
            Lời thuyết minh
            <LangTag lang={lang} />
          </>
        }
        aside={
          <button
            type="button"
            onClick={speak}
            disabled={!text.trim()}
            className={cx(
              'inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full transition disabled:opacity-40',
              speaking ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
            )}
          >
            <i className={cx('fa-solid', speaking ? 'fa-stop' : 'fa-volume-high')}></i>
            {speaking ? 'Dừng' : 'Nghe thử giọng đọc'}
          </button>
        }
      >
        <TextArea
          rows={rows}
          value={text}
          onChange={(e) => {
            onText(e.target.value);
            if (!audioUrl) onDuration(estimateSec(e.target.value, lang));
          }}
          placeholder={PLACEHOLDER[lang]}
          lang={languageMeta(lang).bcp47}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500">
          <b className="text-slate-800 tabular-nums">{words.toLocaleString('vi-VN')}</b> {unit}
        </span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-500">
          Thời lượng <b className="text-slate-800 tabular-nums">≈ {fmtClock(shown)}</b>
          <span className="text-slate-400"> {fromAudio ? '(theo tệp âm thanh)' : `(ước tính ${WORDS_PER_MIN[lang]} ${unit}/phút: ${fmtClock(est)})`}</span>
        </span>
        <span className="ml-auto">
          {status === 'ok' && (
            <Badge tone="green" icon="fa-circle-check">
              Đạt chuẩn {fmtTarget}
            </Badge>
          )}
          {status === 'short' && (
            <Badge tone="amber" icon="fa-triangle-exclamation">
              Ngắn hơn {fmtClock(target[0])} – nên bổ sung
            </Badge>
          )}
          {status === 'long' && (
            <Badge tone="amber" icon="fa-triangle-exclamation">
              Dài hơn {fmtClock(target[1])} – nên rút gọn
            </Badge>
          )}
          {status === 'empty' && <Badge tone="slate">Chưa có nội dung</Badge>}
        </span>
      </div>
      {shown > 0 && (
        <div>
          <div className="relative h-2 rounded-full bg-slate-100 overflow-hidden">
            {previewSec ? (
              <>
                <div className="absolute inset-y-0 left-0 bg-teal-400" style={{ width: `${Math.min(100, (previewSec / shown) * 100)}%` }} />
                <div className="absolute inset-y-0 right-0 admin-hatch" style={{ left: `${Math.min(100, (previewSec / shown) * 100)}%` }} />
              </>
            ) : (
              <div className="absolute inset-0 bg-sky-400" />
            )}
          </div>
          {previewSec ? (
            <p className="text-[11px] text-slate-500 mt-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-teal-400 mr-1"></span>
              {fmtClock(Math.min(previewSec, shown))} nghe thử miễn phí
              <span className="inline-block w-2 h-2 rounded-sm admin-hatch bg-slate-100 ml-3 mr-1 align-middle"></span>
              {fmtClock(Math.max(0, shown - previewSec))} cần mua vé để nghe
            </p>
          ) : null}
        </div>
      )}
      <AudioUpload
        value={audioUrl}
        onChange={(u) => {
          onAudio(u);
          if (!u) onDuration(estimateSec(text, lang));
        }}
        onDuration={onDuration}
        label={`Tệp âm thanh thu sẵn (${languageMeta(lang).viName}) – tuỳ chọn`}
      />
    </div>
  );
};
