// Các thành phần giao diện nhỏ dùng chung: Button, Badge, Card, Segmented, Skeleton, EmptyState, Toggle…
import React from 'react';
import { cx, type Tone } from '../utils';

// ---------- Button ----------
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'dark';
const BTN: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-sky-600 to-teal-500 text-white shadow-sm shadow-sky-600/20 hover:shadow-md hover:shadow-sky-600/25 hover:brightness-105',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/20',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20',
  dark: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'xs' | 'sm' | 'md';
  icon?: string;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'secondary', size = 'md', icon, loading, className, children, disabled, ...rest }) => (
  <button
    type="button"
    {...rest}
    disabled={disabled || loading}
    className={cx(
      'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-150 whitespace-nowrap select-none',
      'disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40',
      size === 'xs' && 'text-[11px] px-2.5 py-1',
      size === 'sm' && 'text-xs px-3.5 py-1.5',
      size === 'md' && 'text-sm px-4 py-2',
      BTN[variant],
      className
    )}
  >
    {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : icon ? <i className={cx('fa-solid', icon)}></i> : null}
    {children}
  </button>
);

export const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; tone?: 'default' | 'danger'; label: string }> = ({
  icon,
  tone = 'default',
  label,
  className,
  ...rest
}) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    {...rest}
    className={cx(
      'w-8 h-8 inline-flex items-center justify-center rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed',
      tone === 'danger' ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-sky-700 hover:bg-sky-50',
      className
    )}
  >
    <i className={cx('fa-solid text-[13px]', icon)}></i>
  </button>
);

// ---------- Badge ----------
const TONE: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200'
};
const DOT: Record<Tone, string> = {
  slate: 'bg-slate-400',
  sky: 'bg-sky-500',
  teal: 'bg-teal-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
  violet: 'bg-violet-500',
  orange: 'bg-orange-500'
};

export const Badge: React.FC<{ tone?: Tone; icon?: string; dot?: boolean; className?: string; children: React.ReactNode; title?: string }> = ({
  tone = 'slate',
  icon,
  dot,
  className,
  children,
  title
}) => (
  <span
    title={title}
    className={cx('inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset whitespace-nowrap', TONE[tone], className)}
  >
    {dot && <span className={cx('w-1.5 h-1.5 rounded-full', DOT[tone])}></span>}
    {icon && <i className={cx('fa-solid text-[10px]', icon)}></i>}
    {children}
  </span>
);

/** Chip "dữ liệu mô phỏng" – minh bạch về số liệu demo. */
export const SimulatedChip: React.FC<{ className?: string; label?: string }> = ({ className, label = 'Bao gồm dữ liệu mô phỏng' }) => (
  <span
    title="Hệ thống đang sinh khách tham quan và lịch sử đơn hàng mô phỏng để trình diễn. Tắt trong Cài đặt."
    className={cx(
      'inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
      className
    )}
  >
    <i className="fa-solid fa-flask text-[10px]"></i>
    {label}
  </span>
);

export const LiveDot: React.FC<{ className?: string; color?: string }> = ({ className, color = 'bg-emerald-500' }) => (
  <span className={cx('relative inline-flex w-2.5 h-2.5', className)}>
    <span className={cx('absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping', color)}></span>
    <span className={cx('relative inline-flex rounded-full w-2.5 h-2.5', color)}></span>
  </span>
);

// ---------- Card ----------
interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ title, subtitle, icon, actions, children, className, bodyClassName, noPadding }) => (
  <section className={cx('bg-white rounded-3xl border border-slate-200 shadow-sm shadow-slate-200/50 min-w-0', className)}>
    {(title || actions) && (
      <header className="flex flex-wrap items-start gap-3 px-5 sm:px-6 pt-5 pb-1">
        {icon && (
          <div className="w-9 h-9 shrink-0 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <i className={cx('fa-solid text-sm', icon)}></i>
          </div>
        )}
        <div className="min-w-0 flex-1">
          {title && <h3 className="text-[15px] font-extrabold text-slate-900 leading-tight">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
    )}
    <div className={cx(noPadding ? '' : 'px-5 sm:px-6 pb-5 pt-4', bodyClassName)}>{children}</div>
  </section>
);

// ---------- Segmented control ----------
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className
}: {
  options: Array<{ value: NoInfer<T>; label: React.ReactNode; icon?: string }>;
  value: T;
  onChange: (v: NoInfer<T>) => void;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div role="tablist" className={cx('inline-flex p-1 bg-slate-100 rounded-full border border-slate-200/70', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-full font-bold transition-all whitespace-nowrap',
            size === 'sm' ? 'text-[11px] px-2.5 py-1' : 'text-xs px-3.5 py-1.5',
            value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          )}
        >
          {o.icon && <i className={cx('fa-solid', o.icon)}></i>}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Tabs (gạch chân) ----------
export function Tabs<T extends string>({
  tabs,
  value,
  onChange
}: {
  tabs: Array<{ value: NoInfer<T>; label: string; icon?: string; badge?: React.ReactNode }>;
  value: T;
  onChange: (v: NoInfer<T>) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto -mb-px">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            'inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-bold border-b-2 whitespace-nowrap transition',
            value === t.value ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          {t.icon && <i className={cx('fa-solid text-xs', t.icon)}></i>}
          {t.label}
          {t.badge}
        </button>
      ))}
    </div>
  );
}

// ---------- Skeleton ----------
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cx('animate-pulse rounded-xl bg-slate-200/70', className)} />
);

export const SkeletonRows: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-2.5 w-1/4" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    ))}
  </div>
);

// ---------- EmptyState ----------
export const EmptyState: React.FC<{ icon?: string; title: string; desc?: React.ReactNode; action?: React.ReactNode; compact?: boolean }> = ({
  icon = 'fa-inbox',
  title,
  desc,
  action,
  compact
}) => (
  <div className={cx('flex flex-col items-center justify-center text-center', compact ? 'py-8' : 'py-14')}>
    <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
      <i className={cx('fa-solid text-xl', icon)}></i>
    </div>
    <p className="text-sm font-bold text-slate-800">{title}</p>
    {desc && <p className="text-xs text-slate-500 mt-1 max-w-sm">{desc}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// ---------- Toggle ----------
export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: React.ReactNode; size?: 'sm' | 'md' }> = ({
  checked,
  onChange,
  disabled,
  label,
  size = 'md'
}) => (
  <label className={cx('inline-flex items-center gap-2.5 select-none', disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer')}>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cx(
        'relative inline-flex shrink-0 rounded-full transition-colors duration-200',
        size === 'sm' ? 'w-8 h-[18px]' : 'w-10 h-6',
        checked ? 'bg-gradient-to-r from-sky-600 to-teal-500' : 'bg-slate-300'
      )}
    >
      <span
        className={cx(
          'absolute top-0.5 left-0.5 bg-white rounded-full shadow transition-transform duration-200',
          size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5',
          checked && (size === 'sm' ? 'translate-x-[14px]' : 'translate-x-4')
        )}
      />
    </button>
    {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
  </label>
);

// ---------- Progress ----------
export const ProgressBar: React.FC<{ value: number; max: number; className?: string; color?: string }> = ({ value, max, className, color }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={cx('h-1.5 w-full bg-slate-100 rounded-full overflow-hidden', className)}>
      <div
        className={cx('h-full rounded-full transition-all duration-500', !color && (pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-sky-500'))}
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
};

export const PageHeader: React.FC<{ title: string; desc?: React.ReactNode; actions?: React.ReactNode; extra?: React.ReactNode }> = ({ title, desc, actions, extra }) => (
  <div className="flex flex-col lg:flex-row lg:items-end gap-3 lg:gap-6 mb-6">
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl sm:text-[28px] font-black tracking-tight text-slate-900">{title}</h1>
        {extra}
      </div>
      {desc && <p className="text-sm text-slate-500 mt-1">{desc}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
