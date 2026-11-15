import React, { useEffect, useMemo, useState } from 'react';
import type { Order, OrderQuery, OrderStatus } from '../../types';
import { adminApi, api } from '../../services/api';
import { useAdmin } from '../AdminContext';
import { useDebounced, useResource } from '../hooks';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toasts';
import { Select, TextInput } from '../components/FormField';
import { Badge, Button, Card, IconButton, PageHeader } from '../components/ui';
import { LANG_FLAG, ORDER_STATUS, PAY_METHOD, copyText, cx, downloadBlob, fmtDateTime, fmtNum, formatVnd, localDate } from '../utils';

type Action = 'paid' | 'refunded' | 'cancelled';

const ACTION_META: Record<Action, { title: string; confirm: string; message: string; tone: 'danger' | 'primary'; icon: string; done: string }> = {
  paid: {
    title: 'Xác nhận đã thanh toán?',
    confirm: 'Xác nhận đã nhận tiền',
    message: 'Hệ thống sẽ phát hành vé và mở khoá thuyết minh ngay cho khách. Chỉ xác nhận khi bạn đã kiểm tra tiền về tài khoản.',
    tone: 'primary',
    icon: 'fa-circle-check',
    done: 'Đã xác nhận thanh toán'
  },
  refunded: {
    title: 'Hoàn tiền đơn hàng?',
    confirm: 'Hoàn tiền',
    message: 'Vé của khách sẽ bị thu hồi ngay lập tức (không nghe tiếp được phần trả phí). Doanh thu của đơn này bị loại khỏi thống kê.',
    tone: 'danger',
    icon: 'fa-rotate-left',
    done: 'Đã hoàn tiền'
  },
  cancelled: {
    title: 'Hủy đơn hàng?',
    confirm: 'Hủy đơn',
    message: 'Đơn hàng sẽ bị hủy; nếu đã có vé, vé sẽ bị thu hồi.',
    tone: 'danger',
    icon: 'fa-ban',
    done: 'Đã hủy đơn'
  }
};

const PRESETS = [
  { key: 'today', label: 'Hôm nay', from: () => localDate(0), to: () => localDate(0) },
  { key: '7d', label: '7 ngày', from: () => localDate(-6), to: () => localDate(0) },
  { key: '30d', label: '30 ngày', from: () => localDate(-29), to: () => localDate(0) },
  { key: 'all', label: 'Tất cả', from: () => '', to: () => '' }
];

const PAGE_SIZE = 20;

const OrdersPage: React.FC = () => {
  const { handleError } = useAdmin();
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [qInput, setQInput] = useState('');
  const q = useDebounced(qInput.trim(), 400);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Order | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const query: OrderQuery = useMemo(() => ({ status, from, to, q, page, pageSize: PAGE_SIZE }), [status, from, to, q, page]);
  const orders = useResource(() => adminApi.listOrders(query), [query], { pollMs: 20000 });
  const sites = useResource(() => adminApi.listSites(), []);
  const siteName = (id: number | null) => (id ? sites.data?.find((s) => s.id === id)?.nameVi || `#${id}` : '—');

  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  const act = async (o: Order, action: Action) => {
    const m = ACTION_META[action];
    const ok = await confirm({
      title: m.title,
      message: (
        <>
          <p className="mb-2">
            Đơn <b className="font-mono">{o.id}</b> · {o.packageName} · <b>{formatVnd(o.amount)}</b>
          </p>
          {m.message}
        </>
      ),
      confirmText: m.confirm,
      tone: m.tone,
      icon: m.icon
    });
    if (!ok) return;
    setBusy(o.id);
    try {
      const u = await adminApi.updateOrderStatus(o.id, action);
      orders.setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === o.id ? { ...x, ...u } : x)) } : d));
      if (detail?.id === o.id) setDetail({ ...detail, ...u });
      toast.success(m.done, o.id);
    } catch (e) {
      handleError(e, 'Không cập nhật được đơn hàng');
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await adminApi.exportOrdersCsv({ status, from, to, q });
      downloadBlob(blob, `don-hang-${localDate(0)}.csv`);
      toast.success('Đã xuất tệp CSV', 'Mở bằng Excel hoặc Google Sheets.');
    } catch (e) {
      handleError(e, 'Không xuất được CSV');
    } finally {
      setExporting(false);
    }
  };

  const activePreset = PRESETS.find((p) => p.from() === from && p.to() === to)?.key;

  const actionsFor = (o: Order) => (
    <div className="inline-flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      {o.status === 'pending' && <IconButton icon="fa-circle-check" label="Xác nhận đã thanh toán" disabled={busy === o.id} onClick={() => act(o, 'paid')} className="hover:!text-emerald-600 hover:!bg-emerald-50" />}
      {o.status === 'paid' && <IconButton icon="fa-rotate-left" label="Hoàn tiền" tone="danger" disabled={busy === o.id} onClick={() => act(o, 'refunded')} />}
      {(o.status === 'pending' || o.status === 'paid') && <IconButton icon="fa-ban" label="Hủy đơn" tone="danger" disabled={busy === o.id} onClick={() => act(o, 'cancelled')} />}
      {(o.status === 'cancelled' || o.status === 'expired') && <IconButton icon="fa-circle-check" label="Đánh dấu đã thanh toán" disabled={busy === o.id} onClick={() => act(o, 'paid')} />}
      <IconButton icon="fa-eye" label="Chi tiết" onClick={() => setDetail(o)} />
    </div>
  );

  const columns: Column<Order>[] = [
    {
      key: 'id',
      header: 'Mã đơn',
      render: (o) => (
        <div>
          <span className="font-mono text-xs font-bold text-slate-900">{o.id}</span>
          {o.demo && <span className="ml-1.5 text-[9px] font-extrabold uppercase text-amber-600" title="Dữ liệu lịch sử mô phỏng">demo</span>}
          <p className="text-[11px] text-slate-400">{fmtDateTime(o.createdAt)}</p>
        </div>
      )
    },
    {
      key: 'customer',
      header: 'Khách hàng',
      hideOnMobile: true,
      render: (o) => (
        <div className="min-w-0 max-w-[180px]">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {o.lang && <span className="mr-1">{LANG_FLAG[o.lang]}</span>}
            {o.customerName || <span className="text-slate-400 font-normal">Khách vãng lai</span>}
          </p>
          <p className="text-[11px] text-slate-500 font-mono">{o.customerPhone || '—'}</p>
        </div>
      )
    },
    {
      key: 'pkg',
      header: 'Gói vé',
      render: (o) => (
        <div className="min-w-0 max-w-[200px]">
          <p className="text-sm font-semibold text-slate-800 truncate">{o.packageName}</p>
          <p className="text-[11px] text-slate-500 truncate">{o.siteId ? siteName(o.siteId) : 'Toàn bộ điểm'}</p>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Số tiền',
      align: 'right',
      render: (o) => <span className="font-bold text-slate-900 tabular-nums whitespace-nowrap">{formatVnd(o.amount)}</span>
    },
    {
      key: 'method',
      header: 'Kênh',
      hideOnMobile: true,
      render: (o) => (
        <span className="text-xs text-slate-600 whitespace-nowrap">
          <i className={cx('fa-solid mr-1.5', PAY_METHOD[o.method]?.icon)}></i>
          {PAY_METHOD[o.method]?.label || o.method}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (o) => {
        const st = ORDER_STATUS[o.status];
        return (
          <div>
            <Badge tone={st.tone} icon={st.icon}>
              {st.label}
            </Badge>
            {o.paidAt && <p className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">{fmtDateTime(o.paidAt)}</p>}
          </div>
        );
      }
    },
    { key: 'actions', header: '', align: 'right', render: actionsFor }
  ];

  const statusCounts = orders.data?.total;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đơn hàng & Vé"
        desc="Theo dõi giao dịch mua vé thuyết minh, xác nhận chuyển khoản, hoàn tiền và tra cứu vé đã phát hành."
        actions={
          <Button icon="fa-file-csv" loading={exporting} onClick={exportCsv}>
            Xuất CSV
          </Button>
        }
      />

      <Card noPadding className="p-5 sm:p-6">
        <div className="flex flex-col xl:flex-row gap-3 mb-5">
          <div className="relative xl:w-80 self-start w-full">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              value={qInput}
              onChange={(e) => {
                setQInput(e.target.value);
                setPage(1);
              }}
              placeholder="Mã đơn, số điện thoại, tên khách…"
              className="w-full bg-slate-50 border border-slate-200 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
            <div className="w-44">
              <Select value={status} onChange={(e) => resetPage(setStatus)(e.target.value as any)} className="!py-2 !rounded-full">
                <option value="">Mọi trạng thái</option>
                {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS[s].label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <TextInput type="date" value={from} max={to || undefined} onChange={(e) => resetPage(setFrom)(e.target.value)} className="!py-1.5 !rounded-full min-w-0 flex-1 sm:flex-none sm:w-[150px]" />
              <span className="text-slate-400 text-xs">→</span>
              <TextInput type="date" value={to} min={from || undefined} onChange={(e) => resetPage(setTo)(e.target.value)} className="!py-1.5 !rounded-full min-w-0 flex-1 sm:flex-none sm:w-[150px]" />
            </div>
            <div className="inline-flex p-1 bg-slate-100 rounded-full border border-slate-200/70">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => {
                    setFrom(p.from());
                    setTo(p.to());
                    setPage(1);
                  }}
                  className={cx(
                    'text-[11px] font-bold px-2.5 py-1 rounded-full transition',
                    activePreset === p.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-slate-500">
          <span>
            Tìm thấy <b className="text-slate-800">{statusCounts === undefined ? '…' : fmtNum(statusCounts)}</b> đơn hàng
          </span>
          {orders.refreshing && <i className="fa-solid fa-circle-notch fa-spin text-sky-500"></i>}
          {(status || from || to || q) && (
            <button
              className="ml-1 font-semibold text-sky-700 hover:underline"
              onClick={() => {
                setStatus('');
                setFrom('');
                setTo('');
                setQInput('');
                setPage(1);
              }}
            >
              Xoá bộ lọc
            </button>
          )}
        </div>
        <DataTable
          columns={columns}
          rows={orders.data?.items}
          rowKey={(o) => o.id}
          loading={orders.loading}
          onRowClick={(o) => setDetail(o)}
          server={{ page, pageSize: PAGE_SIZE, total: orders.data?.total || 0, onPage: setPage }}
        />
      </Card>

      <OrderDetail order={detail} siteName={siteName} onClose={() => setDetail(null)} onAction={act} busy={busy === detail?.id} />
    </div>
  );
};

const OrderDetail: React.FC<{
  order: Order | null;
  siteName: (id: number | null) => string;
  onClose: () => void;
  onAction: (o: Order, a: Action) => void;
  busy: boolean;
}> = ({ order, siteName, onClose, onAction, busy }) => {
  const toast = useToast();
  const [fetched, setFetched] = useState<{ id: string; status: string; ticket: Order['ticket'] | null } | null>(null);
  // Danh sách admin không kèm vé -> lấy chi tiết đơn (có vé khi đã thanh toán)
  useEffect(() => {
    if (!order) return;
    let alive = true;
    api
      .getOrder(order.id)
      .then((r) => alive && setFetched({ id: order.id, status: order.status, ticket: r.ticket || null }))
      .catch(() => alive && setFetched({ id: order.id, status: order.status, ticket: null }));
    return () => {
      alive = false;
    };
  }, [order?.id, order?.status]);
  if (!order) return null;
  const st = ORDER_STATUS[order.status];
  const loadingTicket = !order.ticket && !(fetched && fetched.id === order.id && fetched.status === order.status);
  const t = order.ticket || (fetched && fetched.id === order.id ? fetched.ticket : null);
  const expired = t ? new Date(t.expiresAt).getTime() < Date.now() : false;
  const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className="text-sm text-slate-900 text-right min-w-0 break-words">{children}</span>
    </div>
  );
  return (
    <Modal
      open
      onClose={onClose}
      icon="fa-receipt"
      size="lg"
      title={
        <span className="flex flex-wrap items-center gap-2">
          Đơn <span className="font-mono">{order.id}</span>
          <Badge tone={st.tone} icon={st.icon}>
            {st.label}
          </Badge>
          {order.demo && <Badge tone="amber">Dữ liệu mô phỏng</Badge>}
        </span>
      }
      subtitle={`Tạo lúc ${fmtDateTime(order.createdAt)}`}
      footer={
        <>
          {order.status === 'pending' && (
            <Button variant="success" icon="fa-circle-check" loading={busy} onClick={() => onAction(order, 'paid')}>
              Xác nhận đã thanh toán
            </Button>
          )}
          {order.status === 'paid' && (
            <Button variant="danger" icon="fa-rotate-left" loading={busy} onClick={() => onAction(order, 'refunded')}>
              Hoàn tiền
            </Button>
          )}
          {(order.status === 'pending' || order.status === 'paid') && (
            <Button icon="fa-ban" disabled={busy} onClick={() => onAction(order, 'cancelled')}>
              Hủy đơn
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        </>
      }
    >
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Thông tin đơn</p>
          <Row label="Gói vé">{order.packageName}</Row>
          <Row label="Địa điểm">{order.siteId ? siteName(order.siteId) : 'Toàn bộ điểm'}</Row>
          <Row label="Số tiền">
            <b className="text-base">{formatVnd(order.amount)}</b>
          </Row>
          <Row label="Phương thức">
            <i className={cx('fa-solid mr-1.5 text-slate-400', PAY_METHOD[order.method]?.icon)}></i>
            {PAY_METHOD[order.method]?.label}
          </Row>
          <Row label="Nội dung CK">
            <span className="font-mono text-xs">{order.transferNote}</span>
          </Row>
          <Row label="Thanh toán lúc">{fmtDateTime(order.paidAt)}</Row>
          <Row label="Hạn thanh toán">{fmtDateTime(order.expiresAt)}</Row>
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Khách hàng</p>
          <Row label="Họ tên">{order.customerName || '—'}</Row>
          <Row label="Điện thoại">{order.customerPhone || '—'}</Row>
          <Row label="Ngôn ngữ">{order.lang ? `${LANG_FLAG[order.lang]} ${order.lang.toUpperCase()}` : '—'}</Row>
          <Row label="Mã khách">
            <span className="font-mono text-[11px]">{order.visitorId || '—'}</span>
          </Row>

          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mt-5 mb-2">Vé đã phát hành</p>
          {loadingTicket ? (
            <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          ) : t ? (
            <div className={cx('rounded-2xl border p-4', order.status === 'paid' && !expired ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50')}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900">
                  <i className="fa-solid fa-ticket mr-1.5 text-emerald-600"></i>
                  {t.packageName}
                </p>
                {order.status !== 'paid' ? <Badge tone="red">Đã thu hồi</Badge> : expired ? <Badge tone="slate">Hết hạn</Badge> : <Badge tone="green">Còn hiệu lực</Badge>}
              </div>
              <p className="text-xs text-slate-600 mt-2">
                Phạm vi: <b>{t.scope === 'all' ? 'Toàn bộ điểm' : t.siteIds.map((id) => siteName(id)).join(', ')}</b>
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Hiệu lực: {fmtDateTime(t.issuedAt)} → <b>{fmtDateTime(t.expiresAt)}</b>
              </p>
              <button
                onClick={async () => (await copyText(t.token)) && toast.success('Đã sao chép mã vé')}
                className="mt-3 w-full flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono text-[11px] text-slate-700 hover:border-sky-300 transition"
                title="Sao chép"
              >
                <span className="truncate flex-1 text-left">{t.token}</span>
                <i className="fa-regular fa-copy text-slate-400"></i>
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-center">
              {order.status === 'refunded' || order.status === 'cancelled' ? 'Vé của đơn này đã bị thu hồi.' : 'Chưa phát hành vé (đơn chưa được thanh toán).'}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OrdersPage;
