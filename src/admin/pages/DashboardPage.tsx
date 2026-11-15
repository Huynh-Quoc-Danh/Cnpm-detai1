import React, { useEffect, useMemo, useState } from 'react';
import type { HeritageSite, Order, SalesRange } from '../../types';
import { adminApi } from '../../services/api';
import { useAdmin } from '../AdminContext';
import { useNow, useResource } from '../hooks';
import { StatCard } from '../components/StatCard';
import { Badge, Button, Card, EmptyState, LiveDot, PageHeader, Segmented, SimulatedChip, Skeleton, SkeletonRows } from '../components/ui';
import { Donut, SalesCharts } from '../components/SalesCharts';
import { AdminMap } from '../components/AdminMap';
import { ORDER_STATUS, PAY_METHOD, cx, fmtLongDate, fmtNum, fmtPct, formatVnd, onImgError, timeAgo } from '../utils';

export const RANGE_OPTIONS: Array<{ value: SalesRange; label: string }> = [
  { value: 'day', label: 'Ngày' },
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' }
];
export const RANGE_DESC: Record<SalesRange, string> = {
  day: 'Hôm nay, theo từng giờ',
  week: '7 ngày gần nhất',
  month: '30 ngày gần nhất'
};

const DashboardPage: React.FC = () => {
  const { admin, navigate, settings, reportLive } = useAdmin();
  const [range, setRange] = useState<SalesRange>('week');
  const overview = useResource(() => adminApi.getOverview(), [], { pollMs: 15000 });
  const sales = useResource(() => adminApi.getSales(range), [range], { pollMs: 60000 });
  const live = useResource(() => adminApi.getLive(), [], { pollMs: 5000 });
  const sites = useResource(() => adminApi.listSites(), []);
  const now = useNow(5000);

  useEffect(() => {
    if (live.data) reportLive(live.data.liveTotal);
  }, [live.data, reportLive]);

  const o = overview.data;
  const siteMap = useMemo(() => {
    const m = new Map<number, HeritageSite>();
    (sites.data || []).forEach((s) => m.set(s.id, s));
    return m;
  }, [sites.data]);

  const perSite = useMemo(() => {
    const list = live.data?.perSite || [];
    return [...list].sort((a, b) => b.count - a.count);
  }, [live.data]);
  const maxCount = Math.max(1, ...perSite.map((p) => p.count));
  const liveTotal = live.data?.liveTotal ?? o?.liveTotal ?? 0;
  const liveSim = live.data?.liveSimulated ?? o?.liveSimulated ?? 0;
  const liveReal = live.data?.liveReal ?? o?.liveReal ?? 0;
  const showSim = !!(settings?.simulateVisitors || o?.includesDemoData);

  const hour = Number(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }));
  const greet = hour < 11 ? 'Chào buổi sáng' : hour < 14 ? 'Chào buổi trưa' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greet}, ${admin.displayName || admin.username} 👋`}
        desc={
          <>
            {fmtLongDate()} · Toàn cảnh hoạt động hệ thống thuyết minh Vịnh Hạ Long
            {o && <span className="text-slate-400"> · cập nhật {timeAgo(o.generatedAt, now)}</span>}
          </>
        }
        extra={showSim ? <SimulatedChip /> : undefined}
        actions={
          <>
            <Button icon="fa-qrcode" onClick={() => navigate('qr')}>
              Mã QR
            </Button>
            <Button variant="primary" icon="fa-file-arrow-down" onClick={() => navigate('reports')}>
              Xem báo cáo
            </Button>
          </>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          highlight
          live
          label="Khách đang tham quan"
          icon="fa-person-hiking"
          value={fmtNum(liveTotal)}
          loading={live.loading && overview.loading}
          sub={`${fmtNum(liveReal)} thực · ${fmtNum(liveSim)} mô phỏng`}
          onClick={() => navigate('live')}
        />
        <StatCard
          label="Vé bán hôm nay"
          icon="fa-ticket"
          accent="teal"
          value={fmtNum(o?.tickets.today)}
          trend={o?.trend.tickets.today}
          trendLabel="so với hôm qua cùng giờ"
          loading={overview.loading}
        />
        <StatCard
          label="Doanh thu hôm nay"
          icon="fa-sack-dollar"
          accent="emerald"
          value={formatVnd(o?.revenue.today || 0)}
          trend={o?.trend.revenue.today}
          trendLabel="so với hôm qua cùng giờ"
          loading={overview.loading}
        />
        <StatCard
          label="Lượt nghe hôm nay"
          icon="fa-headphones"
          accent="violet"
          value={fmtNum(o?.listens.today)}
          sub={o ? `${fmtNum(o.listens.week)} trong 7 ngày` : undefined}
          loading={overview.loading}
        />
        <StatCard
          label="Vé 7 ngày"
          icon="fa-calendar-week"
          accent="sky"
          value={fmtNum(o?.tickets.week)}
          trend={o?.trend.tickets.week}
          trendLabel="so với 7 ngày trước"
          loading={overview.loading}
        />
        <StatCard
          label="Vé 30 ngày"
          icon="fa-calendar-days"
          accent="indigo"
          value={fmtNum(o?.tickets.month)}
          trend={o?.trend.tickets.month}
          trendLabel="so với 30 ngày trước"
          loading={overview.loading}
        />
        <StatCard
          label="Doanh thu 30 ngày"
          icon="fa-chart-line"
          accent="amber"
          value={formatVnd(o?.revenue.month || 0)}
          trend={o?.trend.revenue.month}
          trendLabel="so với 30 ngày trước"
          loading={overview.loading}
        />
        <StatCard
          label="Tỉ lệ chuyển đổi"
          icon="fa-arrow-right-arrow-left"
          accent="rose"
          value={fmtPct(o?.conversionRate)}
          sub="khách nghe thử → mua vé (30 ngày)"
          loading={overview.loading}
        />
      </div>

      {/* Doanh số + cơ cấu */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card
          className="xl:col-span-2"
          title="Doanh số bán vé"
          subtitle={RANGE_DESC[range]}
          icon="fa-chart-column"
          actions={<Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} />}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Doanh thu', value: sales.data ? formatVnd(sales.data.totals.revenue) : null },
              { label: 'Vé bán', value: sales.data ? fmtNum(sales.data.totals.tickets) : null },
              { label: 'Lượt nghe', value: sales.data ? fmtNum(sales.data.totals.listens) : null }
            ].map((t, i) => (
              <div key={t.label} className={(i === 0 ? 'col-span-2 sm:col-span-1 ' : '') + 'rounded-2xl bg-slate-50 border border-slate-100 px-3 sm:px-4 py-3 min-w-0'}>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{t.label}</p>
                {t.value === null ? (
                  <Skeleton className="h-6 w-20 mt-1" />
                ) : (
                  <p className="text-base sm:text-xl font-black text-slate-900 tabular-nums truncate">{t.value}</p>
                )}
              </div>
            ))}
          </div>
          <SalesCharts buckets={sales.data?.buckets || null} loading={sales.loading} syncId="dash" />
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-6">
          <Card title="Theo gói vé" subtitle={`Doanh thu · ${RANGE_DESC[range].toLowerCase()}`} icon="fa-ticket">
            <Donut
              loading={sales.loading}
              money
              items={(sales.data?.byPackage || []).map((p) => ({ name: p.name, value: p.revenue }))}
              centerLabel="Tổng"
              centerValue={fmtNum(sales.data?.totals.tickets) + ' vé'}
            />
          </Card>
          <Card title="Phương thức thanh toán" subtitle="Số vé theo kênh thanh toán" icon="fa-wallet">
            <Donut
              loading={sales.loading}
              items={(sales.data?.byMethod || []).map((m) => ({ name: PAY_METHOD[m.method]?.label || m.method, value: m.tickets }))}
              centerLabel="Giao dịch"
              centerValue={fmtNum((sales.data?.byMethod || []).reduce((s, m) => s + m.tickets, 0))}
            />
          </Card>
        </div>
      </div>

      {/* Khách theo điểm */}
      <Card
        title={
          <span className="inline-flex items-center gap-2">
            Khách đang ở từng điểm <LiveDot />
          </span>
        }
        subtitle="Tự động cập nhật mỗi 5 giây · khách có tín hiệu trong 60 giây gần nhất"
        icon="fa-location-dot"
        actions={
          <>
            {liveSim > 0 && <SimulatedChip label={`${fmtNum(liveSim)} khách mô phỏng`} />}
            <Button size="sm" icon="fa-satellite-dish" onClick={() => navigate('live')}>
              Giám sát chi tiết
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <AdminMap
              className="h-72 sm:h-96"
              sites={perSite.map((p) => ({
                id: p.siteId,
                name: p.nameVi,
                lat: p.lat,
                lng: p.lng,
                count: p.count,
                radius: siteMap.get(p.siteId)?.rangeMeters
              }))}
            />
          </div>
          <div className="lg:col-span-2">
            {live.loading ? (
              <SkeletonRows rows={7} />
            ) : perSite.length === 0 ? (
              <EmptyState icon="fa-map-location-dot" title="Chưa có địa điểm" compact />
            ) : (
              <ul className="space-y-3">
                {perSite.map((p) => {
                  const site = siteMap.get(p.siteId);
                  return (
                    <li key={p.siteId} className="flex items-center gap-3">
                      <img
                        src={site?.image}
                        alt=""
                        onError={onImgError(site?.fallbackImage)}
                        className="w-10 h-10 rounded-xl object-cover bg-slate-100 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-bold text-slate-800 truncate">{p.nameVi}</p>
                          <p className="text-sm font-black text-slate-900 tabular-nums">{fmtNum(p.count)}</p>
                        </div>
                        <div className="mt-1.5 h-2 bg-slate-100 rounded-full overflow-hidden flex">
                          <div className="h-full bg-sky-600 transition-all duration-700" style={{ width: `${((p.real || 0) / maxCount) * 100}%` }} />
                          <div
                            className="h-full bg-sky-300 transition-all duration-700"
                            style={{ width: `${((p.simulated ?? p.count) / maxCount) * 100}%`, marginLeft: p.real ? 2 : 0 }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-600"></span>Khách thực (GPS/QR)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-300"></span>Mô phỏng
              </span>
              <span className="ml-auto font-bold text-slate-700">Tổng {fmtNum(liveTotal)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Đơn gần đây + điểm nổi bật */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card
          className="xl:col-span-2"
          title="Đơn hàng gần đây"
          subtitle="10 giao dịch mới nhất"
          icon="fa-receipt"
          actions={
            <Button size="sm" variant="ghost" onClick={() => navigate('orders')}>
              Xem tất cả <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </Button>
          }
        >
          {overview.loading ? <SkeletonRows rows={6} /> : <RecentOrders orders={o?.recentOrders || []} now={now} />}
        </Card>
        <Card title="Điểm được nghe nhiều nhất" subtitle="30 ngày gần nhất" icon="fa-ranking-star">
          {overview.loading ? (
            <SkeletonRows rows={5} />
          ) : !o?.topSites.length ? (
            <EmptyState icon="fa-headphones" title="Chưa có lượt nghe" compact />
          ) : (
            <ol className="space-y-3.5">
              {o.topSites.slice(0, 7).map((t, i) => {
                const s = siteMap.get(t.siteId);
                const maxL = o.topSites[0].listens || 1;
                return (
                  <li key={t.siteId} className="flex items-center gap-3">
                    <span
                      className={cx(
                        'w-7 h-7 shrink-0 rounded-lg text-xs font-black flex items-center justify-center',
                        i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {i + 1}
                    </span>
                    <img src={s?.image} alt="" onError={onImgError(s?.fallbackImage)} className="w-9 h-9 rounded-lg object-cover bg-slate-100 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 truncate">{t.nameVi}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-400" style={{ width: `${(t.listens / maxL) * 100}%` }} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 tabular-nums whitespace-nowrap">
                          {fmtNum(t.listens)} lượt · {fmtNum(t.tickets)} vé
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
};

const RecentOrders: React.FC<{ orders: Order[]; now: number }> = ({ orders, now }) => {
  if (!orders.length) return <EmptyState icon="fa-receipt" title="Chưa có đơn hàng" compact />;
  return (
    <div className="overflow-x-auto -mx-5 sm:-mx-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50/80">
            <th className="text-left px-5 sm:px-6 py-2.5">Mã đơn</th>
            <th className="text-left px-3 py-2.5">Gói vé</th>
            <th className="text-right px-3 py-2.5">Số tiền</th>
            <th className="text-left px-3 py-2.5 hidden 2xl:table-cell">Kênh</th>
            <th className="text-left px-3 py-2.5">Trạng thái</th>
            <th className="text-right px-5 sm:px-6 py-2.5 hidden sm:table-cell">Thời gian</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map((or) => {
            const st = ORDER_STATUS[or.status];
            return (
              <tr key={or.id} className="hover:bg-slate-50/60">
                <td className="px-5 sm:px-6 py-3">
                  <span className="font-mono text-xs font-bold text-slate-800">{or.id}</span>
                  {or.demo && <span className="ml-1.5 text-[9px] font-bold text-amber-600 uppercase">demo</span>}
                </td>
                <td className="px-3 py-3 text-slate-600 max-w-[160px] truncate">{or.packageName}</td>
                <td className="px-3 py-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">{formatVnd(or.amount)}</td>
                <td className="px-3 py-3 hidden 2xl:table-cell text-slate-500 whitespace-nowrap">
                  <i className={cx('fa-solid mr-1.5 text-xs', PAY_METHOD[or.method]?.icon)}></i>
                  {PAY_METHOD[or.method]?.label}
                </td>
                <td className="px-3 py-3">
                  <Badge tone={st.tone} dot>
                    {st.label}
                  </Badge>
                </td>
                <td className="px-5 sm:px-6 py-3 text-right text-xs text-slate-500 whitespace-nowrap hidden sm:table-cell">{timeAgo(or.paidAt || or.createdAt, now)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DashboardPage;
