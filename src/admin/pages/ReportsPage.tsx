import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Order, SalesRange } from '../../types';
import { adminApi } from '../../services/api';
import { useAdmin } from '../AdminContext';
import { useResource } from '../hooks';
import { SalesCharts, Donut } from '../components/SalesCharts';
import { AXIS_TICK, GRID_STROKE, makeTooltip } from '../components/ChartBits';
import { Badge, Button, Card, EmptyState, PageHeader, Segmented, SimulatedChip, Skeleton } from '../components/ui';
import { LANG_FLAG, LANG_LABEL, PAY_METHOD, SERIES, downloadCsv, fmtNum, fmtPct, formatVnd, localDate } from '../utils';
import { RANGE_DESC, RANGE_OPTIONS } from './DashboardPage';

const RANGE_DAYS: Record<SalesRange, number> = { day: 1, week: 7, month: 30 };

/** Lấy toàn bộ đơn đã thanh toán trong khoảng (tối đa 10 trang × 200). */
async function fetchPaidOrders(range: SalesRange): Promise<Order[]> {
  const from = localDate(-(RANGE_DAYS[range] - 1));
  const to = localDate(0);
  const out: Order[] = [];
  for (let page = 1; page <= 10; page++) {
    const r = await adminApi.listOrders({ status: 'paid', from, to, page, pageSize: 200 });
    out.push(...r.items);
    if (out.length >= r.total || r.items.length === 0) break;
  }
  return out;
}

const ListenTip = makeTooltip({});

const ReportsPage: React.FC = () => {
  const { settings } = useAdmin();
  const [range, setRange] = useState<SalesRange>('month');
  const sales = useResource(() => adminApi.getSales(range), [range]);
  const overview = useResource(() => adminApi.getOverview(), []);
  const orders = useResource(() => fetchPaidOrders(range), [range]);
  const sites = useResource(() => adminApi.listSites(), []);

  const s = sales.data;
  const o = overview.data;

  const byLang = useMemo(() => {
    const m: Record<string, { tickets: number; revenue: number }> = {};
    (orders.data || []).forEach((x) => {
      const k = x.lang || 'vi';
      m[k] = m[k] || { tickets: 0, revenue: 0 };
      m[k].tickets++;
      m[k].revenue += x.amount;
    });
    return Object.entries(m).map(([lang, v]) => ({ lang, name: `${LANG_FLAG[lang] || ''} ${LANG_LABEL[lang] || lang}`, ...v }));
  }, [orders.data]);

  const bySite = useMemo(() => {
    const m = new Map<number, { tickets: number; revenue: number }>();
    (orders.data || []).forEach((x) => {
      if (!x.siteId) return;
      const v = m.get(x.siteId) || { tickets: 0, revenue: 0 };
      v.tickets++;
      v.revenue += x.amount;
      m.set(x.siteId, v);
    });
    const listens = new Map((o?.topSites || []).map((t) => [t.siteId, t.listens]));
    return (sites.data || [])
      .map((st) => ({
        siteId: st.id,
        name: st.nameVi,
        short: st.nameVi.replace(/\s*\(.*\)\s*/, ''),
        listens: listens.get(st.id) || 0,
        tickets: m.get(st.id)?.tickets || 0,
        revenue: m.get(st.id)?.revenue || 0
      }))
      .sort((a, b) => b.listens - a.listens);
  }, [orders.data, sites.data, o]);

  const avgOrder = s && s.totals.tickets ? s.totals.revenue / s.totals.tickets : 0;
  const peak = s?.buckets.reduce((best, b) => (b.revenue > (best?.revenue ?? -1) ? b : best), null as null | (typeof s.buckets)[number]);

  const exportBuckets = () => {
    if (!s) return;
    downloadCsv(
      `bao-cao-doanh-so-${range}-${localDate(0)}.csv`,
      ['Kỳ', 'Vé bán', 'Doanh thu (VND)', 'Lượt nghe'],
      [...s.buckets.map((b) => [b.label, b.tickets, b.revenue, b.listens]), ['TỔNG', s.totals.tickets, s.totals.revenue, s.totals.listens]]
    );
  };
  const exportSites = () =>
    downloadCsv(
      `bao-cao-dia-diem-${localDate(0)}.csv`,
      ['Địa điểm', 'Lượt nghe (30 ngày)', `Vé lẻ tại điểm (${RANGE_DESC[range]})`, 'Doanh thu vé lẻ (VND)'],
      bySite.map((x) => [x.name, x.listens, x.tickets, x.revenue])
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo cáo"
        desc="Phân tích doanh thu, số vé, lượt nghe theo thời gian, địa điểm, gói vé, kênh thanh toán và ngôn ngữ."
        extra={o?.includesDemoData ? <SimulatedChip /> : undefined}
        actions={
          <>
            <Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} />
            <Button icon="fa-file-csv" onClick={exportBuckets} disabled={!s}>
              Xuất CSV
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Doanh thu', value: s ? formatVnd(s.totals.revenue) : null, icon: 'fa-sack-dollar', c: 'bg-emerald-50 text-emerald-600' },
          { label: 'Vé bán', value: s ? fmtNum(s.totals.tickets) : null, icon: 'fa-ticket', c: 'bg-teal-50 text-teal-600' },
          { label: 'Giá trị TB / đơn', value: s ? formatVnd(avgOrder) : null, icon: 'fa-receipt', c: 'bg-sky-50 text-sky-600' },
          { label: 'Lượt nghe', value: s ? fmtNum(s.totals.listens) : null, icon: 'fa-headphones', c: 'bg-violet-50 text-violet-600' }
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 min-w-0">
            <div className="flex items-center gap-2">
              <span className={'w-8 h-8 rounded-xl flex items-center justify-center text-xs ' + k.c}>
                <i className={'fa-solid ' + k.icon}></i>
              </span>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">{k.label}</p>
            </div>
            {k.value === null ? <Skeleton className="h-7 w-28 mt-3" /> : <p className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums mt-2 truncate">{k.value}</p>}
            <p className="text-[11px] text-slate-400 mt-1">{RANGE_DESC[range]}</p>
          </div>
        ))}
      </div>

      <Card
        title="Doanh số theo thời gian"
        subtitle={peak && peak.revenue > 0 ? `Cao điểm: ${peak.label} · ${formatVnd(peak.revenue)}` : RANGE_DESC[range]}
        icon="fa-chart-area"
      >
        <SalesCharts buckets={s?.buckets || null} loading={sales.loading} syncId="report" height={260} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Cơ cấu theo gói vé" subtitle={RANGE_DESC[range]} icon="fa-ticket">
          <Donut
            loading={sales.loading}
            money
            items={(s?.byPackage || []).map((p) => ({ name: p.name, value: p.revenue }))}
            centerLabel="Doanh thu"
            centerValue={s ? formatVnd(s.totals.revenue).replace(' ₫', '') : ''}
          />
          {s && s.byPackage.length > 0 && (
            <table className="w-full text-sm mt-5">
              <thead>
                <tr className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="text-left py-2">Gói vé</th>
                  <th className="text-right py-2">Vé</th>
                  <th className="text-right py-2">Doanh thu</th>
                  <th className="text-right py-2">Tỉ trọng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {s.byPackage.map((p) => (
                  <tr key={p.packageId}>
                    <td className="py-2 font-semibold text-slate-800">{p.name}</td>
                    <td className="py-2 text-right tabular-nums">{fmtNum(p.tickets)}</td>
                    <td className="py-2 text-right tabular-nums font-bold">{formatVnd(p.revenue)}</td>
                    <td className="py-2 text-right tabular-nums text-slate-500">{fmtPct(s.totals.revenue ? (p.revenue / s.totals.revenue) * 100 : 0, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card title="Kênh thanh toán" subtitle={RANGE_DESC[range]} icon="fa-wallet">
          <Donut
            loading={sales.loading}
            money
            items={(s?.byMethod || []).map((m) => ({ name: PAY_METHOD[m.method]?.label || m.method, value: m.revenue }))}
            centerLabel="Giao dịch"
            centerValue={fmtNum((s?.byMethod || []).reduce((n, m) => n + m.tickets, 0))}
          />
          {s && s.byMethod.length > 0 && (
            <table className="w-full text-sm mt-5">
              <thead>
                <tr className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="text-left py-2">Kênh</th>
                  <th className="text-right py-2">Giao dịch</th>
                  <th className="text-right py-2">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {s.byMethod.map((m) => (
                  <tr key={m.method}>
                    <td className="py-2 font-semibold text-slate-800">
                      <i className={'fa-solid mr-2 text-slate-400 ' + (PAY_METHOD[m.method]?.icon || '')}></i>
                      {PAY_METHOD[m.method]?.label || m.method}
                    </td>
                    <td className="py-2 text-right tabular-nums">{fmtNum(m.tickets)}</td>
                    <td className="py-2 text-right tabular-nums font-bold">{formatVnd(m.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card
          className="xl:col-span-2"
          title="Lượt nghe theo địa điểm"
          subtitle="30 ngày gần nhất (bao gồm nghe thử và nghe đầy đủ)"
          icon="fa-headphones"
          actions={
            <Button size="sm" icon="fa-file-csv" onClick={exportSites} disabled={!bySite.length}>
              Xuất CSV
            </Button>
          }
        >
          {overview.loading || sites.loading ? (
            <Skeleton className="h-80" />
          ) : !bySite.length ? (
            <EmptyState icon="fa-headphones" title="Chưa có dữ liệu" compact />
          ) : (
            <div style={{ height: Math.max(240, bySite.length * 44) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySite} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
                  <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => fmtNum(v)} />
                  <YAxis type="category" dataKey="short" tick={{ ...AXIS_TICK, fill: '#334155' }} axisLine={false} tickLine={false} width={150} />
                  <Tooltip content={<ListenTip />} cursor={{ fill: 'rgba(148,163,184,.12)' }} />
                  <Bar
                    dataKey="listens"
                    name="Lượt nghe"
                    fill={SERIES[0]}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={22}
                    label={{ position: 'right', fill: '#334155', fontSize: 11, fontWeight: 700, formatter: (v: number) => fmtNum(v) }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Vé theo ngôn ngữ khách" subtitle={`Đơn đã thanh toán · ${RANGE_DESC[range].toLowerCase()}`} icon="fa-language">
          {orders.loading ? (
            <Skeleton className="h-64" />
          ) : !byLang.length ? (
            <EmptyState icon="fa-language" title="Chưa có đơn hàng" compact />
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byLang} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} barCategoryGap="35%">
                    <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} allowDecimals={false} />
                    <Tooltip content={<ListenTip />} cursor={{ fill: 'rgba(148,163,184,.12)' }} />
                    <Bar
                      dataKey="tickets"
                      name="Vé"
                      fill={SERIES[2]}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={56}
                      label={{ position: 'top', fill: '#334155', fontSize: 11, fontWeight: 700, formatter: (v: number) => fmtNum(v) }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-4 space-y-2">
                {byLang.map((l) => (
                  <li key={l.lang} className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">{l.name}</span>
                    <span className="tabular-nums">
                      <b>{fmtNum(l.tickets)}</b> vé · <span className="text-slate-500">{formatVnd(l.revenue)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <Card title="So sánh theo kỳ" subtitle="Hôm nay · 7 ngày · 30 ngày so với kỳ liền trước" icon="fa-scale-balanced">
        {overview.loading || !o ? (
          <Skeleton className="h-32" />
        ) : (
          <div className="overflow-x-auto -mx-5 sm:-mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50/80">
                  <th className="text-left px-5 sm:px-6 py-2.5">Kỳ</th>
                  <th className="text-right px-3 py-2.5">Vé bán</th>
                  <th className="text-right px-3 py-2.5">Thay đổi</th>
                  <th className="text-right px-3 py-2.5">Doanh thu</th>
                  <th className="text-right px-3 py-2.5">Thay đổi</th>
                  <th className="text-right px-5 sm:px-6 py-2.5">Lượt nghe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(['today', 'week', 'month'] as const).map((k) => (
                  <tr key={k}>
                    <td className="px-5 sm:px-6 py-3 font-semibold text-slate-800 whitespace-nowrap">{k === 'today' ? 'Hôm nay' : k === 'week' ? '7 ngày' : '30 ngày'}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-bold">{fmtNum(o.tickets[k])}</td>
                    <td className="px-3 py-3 text-right">
                      <Trend v={o.trend.tickets[k]} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-bold whitespace-nowrap">{formatVnd(o.revenue[k])}</td>
                    <td className="px-3 py-3 text-right">
                      <Trend v={o.trend.revenue[k]} />
                    </td>
                    <td className="px-5 sm:px-6 py-3 text-right tabular-nums">{fmtNum(o.listens[k])}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50/60">
                  <td className="px-5 sm:px-6 py-3 font-extrabold text-slate-900">Toàn thời gian</td>
                  <td className="px-3 py-3 text-right tabular-nums font-black">{fmtNum(o.tickets.total)}</td>
                  <td></td>
                  <td className="px-3 py-3 text-right tabular-nums font-black whitespace-nowrap">{formatVnd(o.revenue.total)}</td>
                  <td></td>
                  <td className="px-5 sm:px-6 py-3 text-right text-xs text-slate-500">Tỉ lệ chuyển đổi {fmtPct(o.conversionRate)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {settings?.simulateVisitors && <p className="text-[11px] text-slate-400 mt-3">* Số liệu bao gồm lịch sử đơn hàng mô phỏng (đánh dấu “demo”) để trình diễn.</p>}
      </Card>
    </div>
  );
};

const Trend: React.FC<{ v: number }> = ({ v }) => (
  <Badge tone={v >= 0 ? 'green' : 'red'} icon={v >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}>
    {v >= 0 ? '+' : ''}
    {fmtPct(v)}
  </Badge>
);

export default ReportsPage;
