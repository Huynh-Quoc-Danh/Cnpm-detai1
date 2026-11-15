// Tooltip & chú giải dùng chung cho các biểu đồ recharts.
import React from 'react';
import { cx, fmtNum, formatVnd } from '../utils';

export const AXIS_TICK = { fill: '#64748b', fontSize: 11, fontWeight: 600 } as const;
export const GRID_STROKE = '#eef2f7';

interface TooltipRow {
  name: string;
  value: number;
  color: string;
  money?: boolean;
}

/** Tooltip gọn: tiêu đề + các dòng giá trị (dùng chữ màu chuẩn, chấm màu nhận diện chuỗi). */
export const ChartTooltipBox: React.FC<{ title?: React.ReactNode; rows: TooltipRow[] }> = ({ title, rows }) => (
  <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-lg shadow-slate-900/10 px-3 py-2.5 min-w-[150px]">
    {title && <p className="text-[11px] font-extrabold text-slate-900 mb-1.5">{title}</p>}
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: r.color }}></span>
          <span className="text-slate-500">{r.name}</span>
          <span className="ml-auto pl-3 font-bold text-slate-900 tabular-nums">{r.money ? formatVnd(r.value) : fmtNum(r.value)}</span>
        </div>
      ))}
    </div>
  </div>
);

/** Adapter cho recharts <Tooltip content={...}/> */
export function makeTooltip(opts: { money?: (dataKey: string) => boolean; title?: (label: any, payload: any[]) => React.ReactNode }) {
  const Comp: React.FC<any> = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <ChartTooltipBox
        title={opts.title ? opts.title(label, payload) : label}
        rows={payload.map((p: any) => ({
          name: p.name,
          value: Number(p.value) || 0,
          color: p.color || p.payload?.fill || p.fill,
          money: opts.money ? opts.money(String(p.dataKey)) : false
        }))}
      />
    );
  };
  return Comp;
}

/** Chú giải dạng danh sách (cho biểu đồ tròn) – nhãn + giá trị + %. */
export const LegendList: React.FC<{
  items: Array<{ name: string; value: number; color: string; sub?: string }>;
  money?: boolean;
  className?: string;
}> = ({ items, money, className }) => {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <ul className={cx('space-y-2', className)}>
      {items.map((i) => (
        <li key={i.name} className="flex items-center gap-2.5 text-xs">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: i.color }}></span>
          <span className="text-slate-600 truncate min-w-0 flex-1" title={i.name}>
            {i.name}
          </span>
          <span className="font-bold text-slate-900 tabular-nums whitespace-nowrap">{money ? formatVnd(i.value) : fmtNum(i.value)}</span>
          <span className="w-11 text-right text-slate-400 tabular-nums">{Math.round((i.value / total) * 100)}%</span>
        </li>
      ))}
    </ul>
  );
};
