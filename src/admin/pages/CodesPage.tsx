import React, { useEffect, useState } from 'react';
import type { ClaimCode, TicketScope } from '../../types';
import { adminApi } from '../../services/api';
import { useAdmin } from '../AdminContext';
import { useResource } from '../hooks';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toasts';
import { Field, NumberInput, Select, TextArea, TextInput } from '../components/FormField';
import { Badge, Button, Card, IconButton, PageHeader, ProgressBar, Toggle } from '../components/ui';
import { copyText, cx, fmtDateTime, fmtHours, fmtNum, randomCode } from '../utils';

const CodesPage: React.FC = () => {
  const { handleError } = useAdmin();
  const toast = useToast();
  const confirm = useConfirm();
  const codes = useResource(() => adminApi.listCodes(), []);
  const sites = useResource(() => adminApi.listSites(), []);
  const [edit, setEdit] = useState<{ open: boolean; code: ClaimCode | null }>({ open: false, code: null });

  const siteName = (id: number) => sites.data?.find((s) => s.id === id)?.nameVi || `#${id}`;
  const all = codes.data || [];
  const totalUses = all.reduce((n, c) => n + c.usedCount, 0);

  const toggle = async (c: ClaimCode, v: boolean) => {
    try {
      const u = await adminApi.updateCode(c.code, { isActive: v });
      codes.setData((l) => (l || []).map((x) => (x.code === c.code ? u : x)));
      toast.success(v ? 'Đã kích hoạt mã' : 'Đã vô hiệu hoá mã', c.code);
    } catch (e) {
      handleError(e);
    }
  };

  const remove = async (c: ClaimCode) => {
    if (!(await confirm({ title: 'Xoá mã kích hoạt?', message: <>Mã <b className="font-mono">{c.code}</b> sẽ không dùng được nữa. Vé đã kích hoạt trước đó vẫn còn hiệu lực.</>, confirmText: 'Xoá mã' })))
      return;
    try {
      await adminApi.deleteCode(c.code);
      codes.setData((l) => (l || []).filter((x) => x.code !== c.code));
      toast.success('Đã xoá mã', c.code);
    } catch (e) {
      handleError(e);
    }
  };

  const columns: Column<ClaimCode>[] = [
    {
      key: 'code',
      header: 'Mã',
      sortValue: (c) => c.code,
      render: (c) => (
        <button
          onClick={async (e) => {
            e.stopPropagation();
            (await copyText(c.code)) && toast.success('Đã sao chép mã', c.code);
          }}
          className="group inline-flex items-center gap-2 font-mono text-sm font-black tracking-wider text-slate-900 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 px-2.5 py-1 rounded-lg transition"
          title="Sao chép"
        >
          {c.code}
          <i className="fa-regular fa-copy text-[10px] text-slate-400 group-hover:text-sky-600"></i>
        </button>
      )
    },
    {
      key: 'scope',
      header: 'Phạm vi',
      render: (c) =>
        c.scope === 'all' ? (
          <Badge tone="teal" icon="fa-earth-asia">
            Toàn bộ điểm
          </Badge>
        ) : (
          <span className="text-xs text-slate-700" title={c.siteIds.map(siteName).join(', ')}>
            <Badge tone="sky" icon="fa-location-dot">
              {c.siteIds.length} điểm
            </Badge>
            <span className="block text-[11px] text-slate-500 mt-0.5 truncate max-w-[180px]">{c.siteIds.map(siteName).join(', ')}</span>
          </span>
        )
    },
    { key: 'dur', header: 'Hiệu lực vé', sortValue: (c) => c.durationHours, hideOnMobile: true, render: (c) => <span className="text-sm">{fmtHours(c.durationHours)}</span> },
    {
      key: 'usage',
      header: 'Lượt dùng',
      sortValue: (c) => c.usedCount / (c.maxUses || 1),
      render: (c) => (
        <div className="min-w-[140px]">
          <div className="flex justify-between text-[11px] mb-1">
            <span className="font-bold text-slate-800 tabular-nums">
              {fmtNum(c.usedCount)} / {fmtNum(c.maxUses)}
            </span>
            <span className="text-slate-400 tabular-nums">{Math.round((c.usedCount / (c.maxUses || 1)) * 100)}%</span>
          </div>
          <ProgressBar value={c.usedCount} max={c.maxUses} />
        </div>
      )
    },
    { key: 'note', header: 'Ghi chú', hideOnMobile: true, render: (c) => <span className="text-xs text-slate-500 line-clamp-2 max-w-[220px]">{c.note || '—'}</span> },
    {
      key: 'created',
      header: 'Ngày tạo',
      hideOnMobile: true,
      sortValue: (c) => c.createdAt || '',
      render: (c) => <span className="text-xs text-slate-500 whitespace-nowrap">{fmtDateTime(c.createdAt)}</span>
    },
    {
      key: 'active',
      header: 'Kích hoạt',
      align: 'center',
      render: (c) => (
        <div className="inline-flex" onClick={(e) => e.stopPropagation()}>
          <Toggle size="sm" checked={c.isActive} onChange={(v) => toggle(c, v)} />
        </div>
      )
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (c) => (
        <div className="inline-flex" onClick={(e) => e.stopPropagation()}>
          <IconButton icon="fa-pen-to-square" label="Sửa" onClick={() => setEdit({ open: true, code: c })} />
          <IconButton icon="fa-trash-can" label="Xoá" tone="danger" onClick={() => remove(c)} />
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mã kích hoạt"
        desc="Mã tặng, mã sự kiện hoặc mã cho đoàn khách – nhập trong ứng dụng để mở khoá thuyết minh đầy đủ mà không cần thanh toán."
        actions={
          <Button variant="primary" icon="fa-wand-magic-sparkles" onClick={() => setEdit({ open: true, code: null })}>
            Tạo mã mới
          </Button>
        }
      />
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Tổng số mã', value: all.length, icon: 'fa-key' },
          { label: 'Đang kích hoạt', value: all.filter((c) => c.isActive).length, icon: 'fa-toggle-on' },
          { label: 'Lượt đã sử dụng', value: totalUses, icon: 'fa-user-check' }
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 items-center justify-center shrink-0">
              <i className={'fa-solid ' + k.icon}></i>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-500 leading-tight">{k.label}</p>
              <p className="text-xl font-black text-slate-900 tabular-nums">{codes.loading ? '…' : fmtNum(k.value)}</p>
            </div>
          </div>
        ))}
      </div>
      <Card noPadding className="p-5 sm:p-6">
        <DataTable
          columns={columns}
          rows={all}
          rowKey={(c) => c.code}
          loading={codes.loading}
          searchText={(c) => `${c.code} ${c.note}`}
          searchPlaceholder="Tìm mã, ghi chú…"
          onRowClick={(c) => setEdit({ open: true, code: c })}
          rowClassName={(c) => (!c.isActive ? 'opacity-60' : undefined)}
        />
      </Card>
      <CodeEditor
        open={edit.open}
        code={edit.code}
        sites={(sites.data || []).map((s) => ({ id: s.id, name: s.nameVi }))}
        onClose={() => setEdit({ open: false, code: null })}
        onSaved={(c) => {
          codes.setData((l) => {
            const arr = l || [];
            return arr.some((x) => x.code === c.code) ? arr.map((x) => (x.code === c.code ? c : x)) : [c, ...arr];
          });
          setEdit({ open: false, code: null });
        }}
      />
    </div>
  );
};

const CodeEditor: React.FC<{
  open: boolean;
  code: ClaimCode | null;
  sites: Array<{ id: number; name: string }>;
  onClose: () => void;
  onSaved: (c: ClaimCode) => void;
}> = ({ open, code, sites, onClose, onSaved }) => {
  const { handleError } = useAdmin();
  const toast = useToast();
  const [d, setD] = useState<ClaimCode>({ code: '', scope: 'all', siteIds: [], durationHours: 24, maxUses: 50, usedCount: 0, isActive: true, note: '' });
  const [prefix, setPrefix] = useState('HL');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setD(code ? { ...code } : { code: 'HL' + randomCode(6), scope: 'all', siteIds: [], durationHours: 24, maxUses: 50, usedCount: 0, isActive: true, note: '' });
  }, [open, code]);

  const set = <K extends keyof ClaimCode>(k: K, v: ClaimCode[K]) => setD((x) => ({ ...x, [k]: v }));

  const save = async () => {
    if (!/^[A-Z0-9_-]{3,32}$/.test(d.code)) return setErr('Mã gồm 3–32 ký tự A–Z, 0–9, _ hoặc -');
    if (d.scope === 'site' && d.siteIds.length === 0) return setErr('Chọn ít nhất một địa điểm');
    setBusy(true);
    setErr(null);
    try {
      const payload = { scope: d.scope, siteIds: d.scope === 'site' ? d.siteIds : [], durationHours: d.durationHours, maxUses: d.maxUses, isActive: d.isActive, note: d.note };
      const saved = code ? await adminApi.updateCode(code.code, payload) : await adminApi.createCode({ ...payload, code: d.code });
      toast.success(code ? 'Đã cập nhật mã' : 'Đã tạo mã kích hoạt', saved.code);
      onSaved(saved);
    } catch (e: any) {
      if (e?.status === 400 || e?.status === 409) setErr(e.message);
      else handleError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="fa-key"
      size="md"
      title={code ? `Sửa mã ${code.code}` : 'Tạo mã kích hoạt'}
      subtitle={code ? `Đã dùng ${fmtNum(code.usedCount)} lượt` : 'Mã ngẫu nhiên, dễ đọc (không có O/0, I/1)'}
      footer={
        <>
          {err && <span className="mr-auto self-center text-xs font-semibold text-rose-600">{err}</span>}
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" icon="fa-check" loading={busy} onClick={save}>
            {code ? 'Lưu' : 'Tạo mã'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Mã kích hoạt" required>
          <div className="flex gap-2">
            <TextInput
              value={d.code}
              disabled={!!code}
              onChange={(e) => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
              className="font-mono font-black tracking-[0.2em] text-base"
            />
            {!code && (
              <>
                <TextInput value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} className="!w-20 font-mono text-center" title="Tiền tố" />
                <Button icon="fa-shuffle" onClick={() => set('code', prefix + randomCode(Math.max(4, 8 - prefix.length)))}>
                  Tạo
                </Button>
              </>
            )}
          </div>
        </Field>
        <Field label="Phạm vi mở khoá">
          <Select value={d.scope} onChange={(e) => set('scope', e.target.value as TicketScope)}>
            <option value="all">Toàn bộ địa điểm</option>
            <option value="site">Chỉ các địa điểm được chọn</option>
          </Select>
        </Field>
        {d.scope === 'site' && (
          <div className="grid sm:grid-cols-2 gap-2">
            {sites.map((s) => {
              const on = d.siteIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => set('siteIds', on ? d.siteIds.filter((x) => x !== s.id) : [...d.siteIds, s.id])}
                  className={cx(
                    'flex items-center gap-2 text-left text-sm px-3 py-2 rounded-xl border transition',
                    on ? 'border-sky-400 bg-sky-50 text-sky-800 font-semibold' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  )}
                >
                  <i className={cx('fa-solid text-xs', on ? 'fa-square-check text-sky-600' : 'fa-square text-slate-300')}></i>
                  <span className="truncate">{s.name}</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Hiệu lực vé sau khi nhập">
            <NumberInput value={d.durationHours} onChange={(v) => set('durationHours', v === '' ? 1 : Math.max(1, Math.round(v)))} suffix="giờ" />
          </Field>
          <Field label="Số lượt dùng tối đa">
            <NumberInput value={d.maxUses} onChange={(v) => set('maxUses', v === '' ? 1 : Math.max(1, Math.round(v)))} suffix="lượt" />
          </Field>
        </div>
        <Field label="Ghi chú nội bộ">
          <TextArea rows={2} value={d.note} onChange={(e) => set('note', e.target.value)} placeholder="VD: Tặng đoàn sinh viên lớp K66" />
        </Field>
        <Toggle checked={d.isActive} onChange={(v) => set('isActive', v)} label="Cho phép sử dụng" />
      </div>
    </Modal>
  );
};

export default CodesPage;
