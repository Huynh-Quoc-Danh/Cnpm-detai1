// Dùng chung cho SiteEditor / ExhibitEditor: chuẩn hoá dữ liệu 5 ngôn ngữ và bộ chọn ngôn ngữ có cờ.
import React from 'react';
import type { ExtraLanguageCode, LanguageCode, LocalizedText } from '../../../types';
import { FlagIcon } from '../../../i18n/FlagIcon';
import { EXTRA_LANGUAGES, LANGUAGES, languageMeta } from '../../../i18n';
import { Segmented } from '../../components/ui';
import { fmtClock } from '../../utils';

export const ALL_LANGS: LanguageCode[] = LANGUAGES.map((l) => l.code);
export const EXTRA_LANGS: ExtraLanguageCode[] = EXTRA_LANGUAGES;

/** Đủ 5 khoá vi/en/ko/ja/zh (dữ liệu cũ chỉ có vi/en). */
export function fillText(v: Partial<LocalizedText> | null | undefined): LocalizedText {
  const o: any = v || {};
  return { vi: o.vi || '', en: o.en || '', ko: o.ko || '', ja: o.ja || '', zh: o.zh || '' };
}
export function fillNum(v: Partial<LocalizedText<number>> | null | undefined): LocalizedText<number> {
  const o: any = v || {};
  const n = (x: unknown) => (typeof x === 'number' && isFinite(x) ? x : 0);
  return { vi: n(o.vi), en: n(o.en), ko: n(o.ko), ja: n(o.ja), zh: n(o.zh) };
}
export function fillUrl(v: Partial<LocalizedText<string | null>> | null | undefined): LocalizedText<string | null> {
  const o: any = v || {};
  return { vi: o.vi || null, en: o.en || null, ko: o.ko || null, ja: o.ja || null, zh: o.zh || null };
}

/** Bộ chọn ngôn ngữ thuyết minh: cờ + mã + thời lượng; chấm xanh khi đã có nội dung. */
export function LangSegmented<T extends LanguageCode>({
  value,
  onChange,
  langs,
  durations,
  filled
}: {
  value: T;
  onChange: (l: T) => void;
  langs: T[];
  durations?: Partial<Record<LanguageCode, number>>;
  filled?: Partial<Record<LanguageCode, boolean>>;
}) {
  return (
    <Segmented<T>
      value={value}
      onChange={onChange}
      className="flex-wrap"
      options={langs.map((l) => ({
        value: l,
        label: (
          <span className="inline-flex items-center gap-1.5" title={languageMeta(l).viName}>
            <FlagIcon code={l} size={16} />
            {languageMeta(l).short}
            {durations && <span className="font-semibold text-slate-400 tabular-nums">{fmtClock(durations[l] || 0)}</span>}
            {filled && (
              <span className={`w-1.5 h-1.5 rounded-full ${filled[l] ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-hidden="true" />
            )}
          </span>
        )
      }))}
    />
  );
}
