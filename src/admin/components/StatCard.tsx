import React from 'react';
import { cx } from '../utils';
import { LiveDot, Skeleton } from './ui';

type Accent = 'sky' | 'teal' | 'emerald' | 'amber' | 'violet' | 'rose' | 'indigo' | 'slate';

const ACCENT: Record<Accent, string> = {
  sky: 'bg-sky-50 text-sky-600 ring-sky-100',
  teal: 'bg-teal-50 text-teal-600 ring-teal-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200'
};

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: string;
  accent?: Accent;
  /** % thay đổi so với kỳ trước (null = không hiển thị) */
  trend?: number | null;
  trendLabel?: string;
  sub?: React.ReactNode;
  live?: boolean;
  loading?: boolean;
  highlight?: boolean;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, accent = 'sky', trend, trendLabel, sub, live, loading, highlight, onClick }) => {
  const up = (trend ?? 0) >= 0;
  return (
    <div
      onClick={onClick}
      className={cx(
        'relative overflow-hidden rounded-3xl border p-5 min-w-0 transition',
        highlight
          ? 'bg-gradient-to-br from-sky-600 via-sky-600 to-teal-500 text-white border-transparent shadow-lg shadow-sky-600/20'
          : 'bg-white border-slate-200 shadow-sm shadow-slate-200/50',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md'
      )}
    >
      {highlight && <div className="absolute -right-8 -top-10 w-36 h-36 rounded-full bg-white/10 blur-sm pointer-events-none" />}
      <div className="flex items-start justify-between gap-3">
        <p className={cx('text-xs font-bold uppercase tracking-wide', highlight ? 'text-sky-50/90' : 'text-slate-500')}>{label}</p>
        <div
          className={cx(
            'w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center ring-1',
            highlight ? 'bg-white/15 text-white ring-white/20' : ACCENT[accent]
          )}
        >
          <i className={cx('fa-solid', icon)}></i>
        </div>
      </div>
      {loading ? (
        <>
          <Skeleton className={cx('h-8 w-24 mt-1', highlight && 'bg-white/30')} />
          <Skeleton className={cx('h-3 w-32 mt-3', highlight && 'bg-white/20')} />
        </>
      ) : (
        <>
          <div className="flex items-center gap-2.5 -mt-1">
            {live && <LiveDot color={highlight ? 'bg-white' : 'bg-emerald-500'} />}
            <p className={cx('text-[26px] sm:text-[28px] font-black tracking-tight tabular-nums leading-none', highlight ? 'text-white' : 'text-slate-900')}>
              {value}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-3 text-xs">
            {trend !== undefined && trend !== null && (
              <span
                className={cx(
                  'inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded-md',
                  highlight ? 'bg-white/15 text-white' : up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                )}
              >
                <i className={cx('fa-solid text-[9px]', up ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down')}></i>
                {up ? '+' : ''}
                {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(trend)}%
              </span>
            )}
            {trendLabel && <span className={highlight ? 'text-sky-50/80' : 'text-slate-400'}>{trendLabel}</span>}
            {sub && <span className={cx('font-medium', highlight ? 'text-sky-50/90' : 'text-slate-500')}>{sub}</span>}
          </div>
        </>
      )}
    </div>
  );
};
