import React, { useEffect, useMemo, useState } from 'react';
import type { LiveVisitor, VisitorSource } from '../../types';
import { adminApi } from '../../services/api';
import { useAdmin } from '../AdminContext';
import { useNow, useResource } from '../hooks';
import { AdminMap } from '../components/AdminMap';
import { DataTable, type Column } from '../components/DataTable';
import { Badge, Button, Card, LiveDot, PageHeader, Segmented, SimulatedChip, Skeleton } from '../components/ui';
import { LANG_FLAG, LANG_LABEL, VISITOR_SOURCE, cx, fmtNum, fmtTime, onImgError, timeAgo } from '../utils';

type SourceFilter = 'all' | VisitorSource;

const LivePage: React.FC = () => {
  const { reportLive, navigate } = useAdmin();
  const [paused, setPaused] = useState(false);
  const live = useResource(() => adminApi.getLive(), [], { pollMs: paused ? undefined : 5000 });
  const sites = useResource(() => adminApi.listSites(), []);
  const now = useNow(1000);
  const [source, setSource] = useState<SourceFilter>('all');
  const [siteFilter, setSiteFilter] = useState<number | null>(null);

  useEffect(() => {
    if (live.data) reportLive(live.data.liveTotal);
  }, [live.data, reportLive]);

  const d = live.data;
  const siteById = useMemo(() => new Map((sites.data || []).map((s) => [s.id, s])), [sites.data]);

  const visitors = useMemo(() => {
    let v = d?.visitors || [];
    if (source !== 'all') v = v.filter((x) => x.source === source);
    if (siteFilter !== null) v = v.filter((x) => x.siteId === siteFilter);
    return v;
  }, [d, source, siteFilter]);

  const bySource = useMemo(() => {
    const c: Record<string, number> = { gps: 0, qr: 0, sim: 0, view: 0 };
    (d?.visitors || []).forEach((v) => (c[v.source] = (c[v.source] || 0) + 1));
    return c;
  }, [d]);
  const mobile = (d?.visitors || []).filter((v) => v.device === 'mobile').length;
  const nextIn = live.updatedAt ? Math.max(0, 5 - Math.floor((now - live.updatedAt) / 1000)) : 5;

  const columns: Column<LiveVisitor>[] = [
    {
      key: 'visitor',
      header: 'Khách',
      sortValue: (v) => v.visitorId,
      render: (v) => (
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs shrink-0" style={{ background: VISITOR_SOURCE[v.source]?.color }}>
            <i className={cx('fa-solid', v.device === 'mobile' ? 'fa-mobile-screen' : 'fa-desktop')}></i>
          </span>
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold text-slate-800 truncate max-w-[140px]">{v.visitorId}</p>
            <p className="text-[11px] text-slate-500">{v.device === 'mobile' ? 'Điện thoại' : 'Máy tính'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'site',
      header: 'Đang ở điểm',
      sortValue: (v) => v.siteName || '',
      render: (v) =>
        v.siteName ? (
          <span className="font-semibold text-slate-800">{v.siteName}</span>
        ) : (
          <span className="text-slate-400 italic text-xs">Ngoài khu vực điểm</span>
        )
    },
    {
      key: 'source',
      header: 'Nguồn',
      sortValue: (v) => v.source,
      render: (v) => (
        <Badge tone={v.source === 'gps' ? 'sky' : v.source === 'qr' ? 'orange' : v.source === 'sim' ? 'teal' : 'slate'} icon={VISITOR_SOURCE[v.source]?.icon}>
          {VISITOR_SOURCE[v.source]?.label || v.source}
        </Badge>
      )
    },
    {
      key: 'lang',
      header: 'Ngôn ngữ',
      hideOnMobile: true,
      sortValue: (v) => v.lang,
      render: (v) => (
        <span className="text-xs text-slate-600 whitespace-nowrap">
          {LANG_FLAG[v.lang]} {LANG_LABEL[v.lang] || v.lang}
        </span>
      )
    },
    {
      key: 'pos',
      header: 'Toạ độ',
      hideOnMobile: true,
      render: (v) =>
        v.lat !== null && v.lng !== null ? (
          <span className="font-mono text-[11px] text-slate-500">
            {v.lat.toFixed(5)}, {v.lng.toFixed(5)}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        )
    },
    {
      key: 'first',
      header: 'Bắt đầu',
      hideOnMobile: true,
      sortValue: (v) => v.firstSeen,
      render: (v) => <span className="text-xs text-slate-500 tabular-nums">{fmtTime(v.firstSeen)}</span>
    },
    {
      key: 'last',
      header: 'Tín hiệu cuối',
      align: 'right',
      sortValue: (v) => -new Date(v.lastSeen).getTime(),
      render: (v) => {
        const age = (now - new Date(v.lastSeen).getTime()) / 1000;
        return (
          <span className={cx('text-xs font-semibold tabular-nums whitespace-nowrap', age < 20 ? 'text-emerald-600' : age < 45 ? 'text-amber-600' : 'text-slate-400')}>
            {timeAgo(v.lastSeen, now)}
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Giám sát trực tiếp"
        desc="Vị trí và số lượng khách đang sử dụng ứng dụng tại các điểm tham quan (tín hiệu trong 60 giây gần nhất)."
        extra={d?.simulateVisitors ? <SimulatedChip label="Đang bật khách mô phỏng" /> : undefined}
        actions={
          <>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1.5">
              {paused ? <i className="fa-solid fa-pause text-amber-500"></i> : <LiveDot />}
              {paused ? 'Đã tạm dừng' : `Làm mới sau ${nextIn}s`}
            </span>
            <Button icon={paused ? 'fa-play' : 'fa-pause'} onClick={() => setPaused((p) => !p)}>
              {paused ? 'Tiếp tục' : 'Tạm dừng'}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <MiniStat label="Đang trực tuyến" value={d?.liveTotal} icon="fa-users" tone="bg-slate-900 text-white" loading={live.loading} className="col-span-2 lg:col-span-1" />
        <MiniStat label="GPS thực" value={bySource.gps} icon="fa-location-crosshairs" dot={VISITOR_SOURCE.gps.color} loading={live.loading} />
        <MiniStat label="Quét QR" value={bySource.qr} icon="fa-qrcode" dot={VISITOR_SOURCE.qr.color} loading={live.loading} />
        <MiniStat label="Mô phỏng" value={bySource.sim} icon="fa-robot" dot={VISITOR_SOURCE.sim.color} loading={live.loading} />
        <MiniStat label="Điện thoại" value={mobile} icon="fa-mobile-screen" loading={live.loading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card
          className="xl:col-span-2"
          title="Bản đồ khách tham quan"
          subtitle="Chấm màu theo nguồn tín hiệu · vòng tròn nét đứt là vùng geofence của điểm"
          icon="fa-map"
          actions={
            siteFilter !== null && (
              <Button size="sm" variant="ghost" icon="fa-xmark" onClick={() => setSiteFilter(null)}>
                Bỏ lọc điểm
              </Button>
            )
          }
        >
          <AdminMap
            className="h-[420px] sm:h-[520px]"
            bubbles={false}
            selectedSiteId={siteFilter}
            onSiteClick={(id) => setSiteFilter((f) => (f === id ? null : id))}
            sites={(d?.perSite || []).map((p) => ({ id: p.siteId, name: p.nameVi, lat: p.lat, lng: p.lng, count: p.count, radius: siteById.get(p.siteId)?.rangeMeters || 300 }))}
            dots={visitors
              .filter((v) => v.lat !== null && v.lng !== null)
              .map((v) => ({
                id: v.visitorId,
                lat: v.lat as number,
                lng: v.lng as number,
                color: VISITOR_SOURCE[v.source]?.color || '#64748b',
                popup: `<b>${v.siteName || 'Ngoài điểm'}</b><br/><span style="font-size:11px;color:#64748b">${VISITOR_SOURCE[v.source]?.label} · ${
                  v.device === 'mobile' ? 'Điện thoại' : 'Máy tính'
                } · ${v.lang.toUpperCase()}</span>`
              }))}
          />
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-[11px] text-slate-600">
            {(['gps', 'qr', 'sim', 'view'] as VisitorSource[]).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow" style={{ background: VISITOR_SOURCE[s].color }}></span>
                {VISITOR_SOURCE[s].label}
              </span>
            ))}
          </div>
        </Card>

        <Card title="Theo điểm tham quan" subtitle="Bấm để lọc danh sách khách" icon="fa-location-dot">
          {live.loading ? (
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2.5">
              {[...(d?.perSite || [])]
                .sort((a, b) => b.count - a.count)
                .map((p) => {
                  const s = siteById.get(p.siteId);
                  const active = siteFilter === p.siteId;
                  return (
                    <button
                      key={p.siteId}
                      onClick={() => setSiteFilter(active ? null : p.siteId)}
                      className={cx(
                        'flex items-center gap-3 p-2.5 rounded-2xl border text-left transition',
                        active ? 'border-sky-400 bg-sky-50 ring-4 ring-sky-500/10' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <img src={s?.image} alt="" onError={onImgError(s?.fallbackImage)} className="w-11 h-11 rounded-xl object-cover bg-slate-100 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">{p.nameVi}</p>
                        <p className="text-[11px] text-slate-500">
                          {fmtNum(p.real || 0)} thực · {fmtNum(p.simulated || 0)} mô phỏng
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-slate-900 tabular-nums leading-none">{fmtNum(p.count)}</p>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">khách</p>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </Card>
      </div>

      <Card
        title="Danh sách khách đang trực tuyến"
        subtitle={`${fmtNum(visitors.length)} khách${siteFilter !== null ? ` tại ${siteById.get(siteFilter)?.nameVi || 'điểm đã chọn'}` : ''}`}
        icon="fa-list"
      >
        <DataTable
          columns={columns}
          rows={visitors}
          rowKey={(v) => v.visitorId}
          loading={live.loading}
          pageSize={15}
          searchText={(v) => `${v.visitorId} ${v.siteName || ''} ${v.lang}`}
          searchPlaceholder="Tìm mã khách, điểm…"
          defaultSort={{ key: 'last', dir: 'asc' }}
          dense
          toolbar={
            <Segmented
              size="sm"
              value={source}
              onChange={setSource}
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'gps', label: 'GPS' },
                { value: 'qr', label: 'QR' },
                { value: 'sim', label: 'Mô phỏng' },
                { value: 'view', label: 'Online' }
              ]}
            />
          }
          empty={
            <div className="py-10 text-center">
              <p className="text-sm font-bold text-slate-700">Chưa có khách nào trực tuyến</p>
              <p className="text-xs text-slate-500 mt-1">
                Mở ứng dụng trên điện thoại (quét QR ở trang{' '}
                <button className="text-sky-700 font-semibold hover:underline" onClick={() => navigate('qr')}>
                  Mã QR
                </button>
                ) để thấy khách thực xuất hiện tại đây.
              </p>
            </div>
          }
        />
      </Card>
    </div>
  );
};

const MiniStat: React.FC<{ label: string; value?: number; icon: string; tone?: string; dot?: string; loading?: boolean; className?: string }> = ({
  label,
  value,
  icon,
  tone,
  dot,
  loading,
  className
}) => (
  <div className={cx('rounded-3xl border p-4 flex items-center gap-3 min-w-0', tone ? tone + ' border-transparent' : 'bg-white border-slate-200 shadow-sm', className)}>
    <div className={cx('w-10 h-10 rounded-2xl flex items-center justify-center shrink-0', tone ? 'bg-white/10' : 'bg-slate-100 text-slate-600')}>
      <i className={cx('fa-solid', icon)}></i>
    </div>
    <div className="min-w-0">
      <p className={cx('text-[11px] font-bold leading-tight line-clamp-2 flex items-center gap-1.5', tone ? 'text-slate-300' : 'text-slate-500')}>
        {dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }}></span>}
        {label}
      </p>
      {loading ? <Skeleton className="h-6 w-10 mt-1" /> : <p className="text-2xl font-black tabular-nums leading-tight">{fmtNum(value)}</p>}
    </div>
  </div>
);

export default LivePage;
