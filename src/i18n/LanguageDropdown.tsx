// Bộ chọn ngôn ngữ (5 ngôn ngữ: vi, en, ko, ja, zh) – cờ SVG + tên bản ngữ.
import React, { useEffect, useRef, useState } from 'react';
import type { LanguageCode } from '../types';
import { FlagIcon } from './FlagIcon';
import { LANGUAGES, languageMeta, tr } from './index';

export const LanguageDropdown: React.FC<{
  lang: LanguageCode;
  onChange: (l: LanguageCode) => void;
  compact?: boolean;
  /** Luôn hiện tên ngôn ngữ đầy đủ (dùng ở thanh trên của trang Bản đồ). */
  full?: boolean;
  align?: 'left' | 'right';
  id?: string;
}> = ({ lang, onChange, compact, full, align = 'right', id }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const current = languageMeta(lang);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = tr(lang, { vi: 'Ngôn ngữ', en: 'Language', ko: '언어', ja: '言語', zh: '语言' });
  const changeTitle = tr(lang, {
    vi: 'Đổi ngôn ngữ',
    en: 'Change language',
    ko: '언어 변경',
    ja: '言語を切り替え',
    zh: '切换语言'
  });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-label={`${label}: ${current.native}`}
        aria-expanded={open}
        title={changeTitle}
        className="h-9 pl-2.5 pr-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
      >
        <FlagIcon code={current.code} />
        {full ? (
          <span className="whitespace-nowrap">{current.native}</span>
        ) : (
          <>
            <span className={compact ? 'hidden' : 'hidden md:inline whitespace-nowrap'}>{current.native}</span>
            {/* Điện thoại: chỉ hiện cờ + mã để tiêu đề ứng dụng không bị cắt */}
            <span className={compact ? 'hidden' : 'hidden sm:inline md:hidden'}>{current.short}</span>
          </>
        )}
        <i className={`fa-solid fa-chevron-down text-[9px] text-slate-400 transition ${open ? 'rotate-180' : ''}`}></i>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} mt-2 w-48 rounded-2xl bg-white border border-slate-200 shadow-xl p-1.5 z-50`}
        >
          {LANGUAGES.map((o) => (
            <li key={o.code}>
              <button
                type="button"
                role="option"
                lang={o.bcp47}
                aria-selected={o.code === lang}
                onClick={() => {
                  onChange(o.code);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition ${
                  o.code === lang ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FlagIcon code={o.code} />
                <span className="flex-1 text-left">{o.native}</span>
                {o.code === lang ? (
                  <i className="fa-solid fa-check text-sky-600"></i>
                ) : (
                  <span className="text-[10px] font-bold text-slate-300">{o.short}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LanguageDropdown;
