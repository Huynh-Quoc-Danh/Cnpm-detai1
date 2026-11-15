// Biểu đồ doanh thu (vùng) + số vé (cột) – hai biểu đồ riêng, đồng bộ con trỏ (không dùng trục kép).
import React from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SalesBucket } from '../../types';
import { SERIES, fmtCompactVnd, fmtNum } from '../utils';
import { AXIS_TICK, GRID_STROKE, LegendList, makeTooltip } from './ChartBits';
import { EmptyState, Skeleton } from './ui';

const REVENUE_COLOR = SERIES[0];
const TICKET_COLOR = SERIES[2];

const RevenueTip = makeTooltip({ money: () => true });
const TicketTip = makeTooltip({});

export const SalesCharts: React.FC<{ buckets: SalesBucket[] | null; loading?: boolean; syncId?: string; height?: number }> = ({
  buckets,
  loading,
  syncId = 'sales',
  height = 220
}) => {
  if (loading && !buckets) {
    return (
      <div className="space-y-3">
        <Skeleton className="w-40 h-3" />
        <Skeleton className="w-full h-52" />
        <Skeleton className="w-full h-28" />
      </div>
    );
  }
  const data = buckets || [];
  const many = data.length > 12;
  return (
    <div className="space-y-2">
      <div>
        <p className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: REVENUE_COLOR }}></span>Doanh thu (₫)
        </p>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} syncId={syncId} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={REVENUE_COLOR} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={REVENUE_COLOR} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="label" hide />
              <YAxis tick={AXIS_TICK} tickFormatter={(v) => fmtCompactVnd(v)} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<RevenueTip />} cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Doanh thu"
                stroke={REVENUE_COLOR}
                strokeWidth={2}
                fill="url(#revFill)"
                dot={false}
                activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: TICKET_COLOR }}></span>Vé bán ra
        </p>
        <div style={{ height: Math.round(height * 0.62) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} syncId={syncId} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap={many ? 2 : '25%'}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={many ? 18 : 6} />
              <YAxis tick={AXIS_TICK} allowDecimals={false} axisLine={false} tickLine={false} width={52} tickFormatter={(v) => fmtNum(v)} />
              <Tooltip content={<TicketTip />} cursor={{ fill: 'rgba(148,163,184,.12)' }} />
              <Bar dataKey="tickets" name="Vé" fill={TICKET_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/** Biểu đồ vòng + chú giải. */
export const Donut: React.FC<{
  items: Array<{ name: string; value: number }>;
  money?: boolean;
  centerLabel: string;
  centerValue: string;
  loading?: boolean;
}> = ({ items, money, centerLabel, centerValue, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center gap-5">
        <Skeleton className="w-32 h-32 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3" />
          <Skeleton className="h-3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    );
  }
  const data = items.filter((i) => i.value > 0);
  if (!data.length) return <EmptyState icon="fa-chart-pie" title="Chưa có dữ liệu" compact />;
  const colored = data.map((d, i) => ({ ...d, color: SERIES[i % SERIES.length] }));
  const Tip = makeTooltip({ money: () => !!money, title: () => null });
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative w-40 h-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={colored} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={2} stroke="#fff" strokeWidth={2} isAnimationActive>
              {colored.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<Tip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{centerLabel}</span>
          <span className="text-base font-black text-slate-900 tabular-nums">{centerValue}</span>
        </div>
      </div>
      <LegendList items={colored} money={money} className="w-full min-w-0" />
    </div>
  );
};
