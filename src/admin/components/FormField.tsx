import React from 'react';
import { cx } from '../utils';
import type { LanguageCode } from '../../types';
import { FlagIcon } from '../../i18n/FlagIcon';

export const inputCls =
  'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 ' +
  'focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition disabled:bg-slate-50 disabled:text-slate-500';

interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ label, hint, error, required, aside, className, children }) => (
  <div className={cx('min-w-0', className)}>
    {(label || aside) && (
      <div className="flex items-center justify-between gap-2 mb-1.5">
        {label && (
          <label className="text-xs font-bold text-slate-700">
            {label}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}
        {aside && <div className="text-[11px] text-slate-500">{aside}</div>}
      </div>
    )}
    {children}
    {error ? (
      <p className="text-[11px] font-semibold text-rose-600 mt-1">
        <i className="fa-solid fa-circle-exclamation mr-1"></i>
        {error}
      </p>
    ) : hint ? (
      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{hint}</p>
    ) : null}
  </div>
);

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { icon?: string; invalid?: boolean }>(
  ({ icon, invalid, className, ...rest }, ref) =>
    icon ? (
      <div className="relative">
        <i className={cx('fa-solid absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none', icon)}></i>
        <input ref={ref} {...rest} className={cx(inputCls, 'pl-9', invalid && 'border-rose-300', className)} />
      </div>
    ) : (
      <input ref={ref} {...rest} className={cx(inputCls, invalid && 'border-rose-300', className)} />
    )
);
TextInput.displayName = 'TextInput';

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className, ...rest }) => (
  <textarea {...rest} className={cx(inputCls, 'leading-relaxed resize-y', className)} />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, children, ...rest }) => (
  <div className="relative">
    <select {...rest} className={cx(inputCls, 'appearance-none pr-9 cursor-pointer', className)}>
      {children}
    </select>
    <i className="fa-solid fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
  </div>
);

/** Ô nhập số: trả về number (hoặc '' khi trống). */
export const NumberInput: React.FC<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
    value: number | '' | null | undefined;
    onChange: (v: number | '') => void;
    suffix?: string;
  }
> = ({ value, onChange, suffix, className, ...rest }) => (
  <div className="relative">
    <input
      type="number"
      inputMode="decimal"
      {...rest}
      value={value === null || value === undefined ? '' : value}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      className={cx(inputCls, suffix && 'pr-14', className)}
    />
    {suffix && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">{suffix}</span>}
  </div>
);

/** Ô chia 2 cột Tiếng Việt / English. */
export const BilingualRow: React.FC<{ children: [React.ReactNode, React.ReactNode] }> = ({ children }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
);

export const LangTag: React.FC<{ lang: LanguageCode }> = ({ lang }) => (
  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 ml-1.5 align-middle">
    <FlagIcon code={lang} size={14} />
    {lang.toUpperCase()}
  </span>
);
