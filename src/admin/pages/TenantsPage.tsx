// Trang "Ban quản lý" (multi-tenant) – chỉ quản trị nền tảng.
// Mỗi ban quản lý sở hữu một số địa điểm; tài khoản của ban chỉ thấy dữ liệu của ban mình
// (địa điểm, gói vé, mã kích hoạt, đơn hàng, khách trực tiếp, thống kê).
import React, { useEffect, useMemo, useState } from 'react';
import type { AdminUser, HeritageSite, Tenant } from '../../types';
import { adminApi } from '../../services/api';
import { useAdmin } from '../AdminContext';
import { useResource } from '../hooks';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toasts';
import { Field, TextInput } from '../components/FormField';
import { Badge, Button, Card, EmptyState, IconButton, PageHeader, Toggle } from '../components/ui';
import { cx, fmtDateTime, fmtNum } from '../utils';

type SiteWithTenant = HeritageSite & { tenantId?: number | null };

// ---------- Thêm / sửa ban ----------
const TenantForm: React.FC<{ tenant: Tenant | null; onClose: () => void; onSaved: (t: Tenant) => void }> = ({ tenant, onClose, onSaved }) => {
  const { handleError } = useAdmin();
  const toast = useToast();
  const [name, setName] = useState(tenant?.name || '');
  const [slug, setSlug] = useState(tenant?.slug || '');
  const [isActive, setIsActive] = useState(tenant ? tenant.isActive : true);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const input = { name: name.trim(), slug: slug.trim() || undefined, isActive };
      const t = tenant ? await adminApi.updateTenant(tenant.id, input) : await adminApi.createTenant(input);
      toast.success(tenant ? 'Đã lưu ban quản lý' : 'Đã thêm ban quản lý', t.name);
      onSaved(t);
    } catch (err) {
      handleError(err, 'Không lưu được ban quản lý');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Tên ban quản lý" required>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Ban quản lý Đảo Ti Tốp" autoFocus required />
      </Field>
      <Field label="Mã định danh (slug)" hint="Để trống sẽ tự tạo từ tên, ví dụ ban-quan-ly-dao-ti-top">
        <TextInput value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ban-quan-ly-..." />
      </Field>
      <Toggle
        checked={isActive}
        onChange={setIsActive}
        disabled={tenant?.isDefault}
        label={isActive ? 'Đang hoạt động' : 'Tạm khoá – tài khoản của ban không đăng nhập được'}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Huỷ
        </Button>
        <Button type="submit" variant="primary" icon="fa-floppy-disk" loading={saving} disabled={!name.trim()}>
          Lưu
        </Button>
      </div>
    </form>
  );
};

// ---------- Gán địa điểm ----------
const SitesForm: React.FC<{ tenant: Tenant; tenants: Tenant[]; onClose: () => void; onSaved: (t: Tenant) => void }> = ({
  tenant,
  tenants,
  onClose,
  onSaved
}) => {
  const { handleError } = useAdmin();
  const toast = useToast();
  const sites = useResource(() => adminApi.listSites() as Promise<SiteWithTenant[]>, []);
  const [picked, setPicked] = useState<Set<number>>(new Set(tenant.siteIds));
  const [saving, setSaving] = useState(false);
  const tenantName = (id?: number | null) => tenants.find((t) => t.id === id)?.name || '—';

  const toggle = (id: number) =>
    setPicked((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const save = async () => {
    setSaving(true);
    try {
      const t = await adminApi.setTenantSites(tenant.id, [...picked]);
      toast.success('Đã cập nhật địa điểm', `${t.name}: ${t.siteIds.length} địa điểm`);
      onSaved(t);
    } catch (err) {
      handleError(err, 'Không cập nhật được địa điểm');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Địa điểm được chọn sẽ chuyển sang <b className="text-slate-800">{tenant.name}</b>.
        {!tenant.isDefault && ' Địa điểm bỏ chọn sẽ trả về ban quản lý mặc định.'}
      </p>
      <ul className="max-h-[50vh] overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
        {(sites.data || []).map((s) => {
          const mine = picked.has(s.id);
          const owner = s.tenantId === tenant.id ? null : tenantName(s.tenantId);
          return (
            <li key={s.id}>
              <label className={cx('flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50', mine && 'bg-sky-50/60')}>
                <input type="checkbox" className="w-4 h-4 accent-sky-600" checked={mine} onChange={() => toggle(s.id)} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-800 truncate">{s.nameVi}</span>
                  <span className="block text-[11px] text-slate-500">#{s.id}</span>
                </span>
                {owner && (
                  <Badge tone={mine ? 'amber' : 'slate'} icon="fa-building">
                    {mine ? `chuyển từ ${owner}` : owner}
                  </Badge>
                )}
              </label>
            </li>
          );
        })}
        {sites.loading && <li className="px-4 py-6 text-sm text-slate-400">Đang tải địa điểm…</li>}
      </ul>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Huỷ
        </Button>
        <Button variant="primary" icon="fa-floppy-disk" loading={saving} onClick={save}>
          Lưu {fmtNum(picked.size)} địa điểm
        </Button>
      </div>
    </div>
  );
};

// ---------- Tài khoản của ban ----------
const AdminsPanel: React.FC<{ tenant: Tenant; onChanged: () => void }> = ({ tenant, onChanged }) => {
  const { handleError } = useAdmin();
  const toast = useToast();
  const confirm = useConfirm();
  const admins = useResource(() => adminApi.listTenantAdmins(tenant.id), [tenant.id]);
  const [form, setForm] = useState({ username: '', displayName: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [resetFor, setResetFor] = useState<AdminUser | null>(null);
  const [newPw, setNewPw] = useState('');

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const a = await adminApi.createTenantAdmin(tenant.id, form);
      admins.setData((l) => [...(l || []), a]);
      setForm({ username: '', displayName: '', password: '' });
      toast.success('Đã tạo tài khoản', `@${a.username} – ${tenant.name}`);
      onChanged();
    } catch (err) {
      handleError(err, 'Không tạo được tài khoản');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: AdminUser) => {
    if (!(await confirm({ title: 'Xoá tài khoản?', message: <>Tài khoản <b>@{a.username}</b> sẽ không đăng nhập được nữa.</>, confirmText: 'Xoá tài khoản' })))
      return;
    try {
      await adminApi.deleteTenantAdmin(a.id);
      admins.setData((l) => (l || []).filter((x) => x.id !== a.id));
      toast.success('Đã xoá tài khoản', `@${a.username}`);
      onChanged();
    } catch (err) {
      handleError(err);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetFor) return;
    try {
      await adminApi.resetTenantAdminPassword(resetFor.id, newPw);
      toast.success('Đã đặt lại mật khẩu', `@${resetFor.username} phải đăng nhập lại`);
      setResetFor(null);
      setNewPw('');
    } catch (err) {
      handleError(err, 'Không đặt lại được mật khẩu');
    }
  };

  const list = admins.data || [];
  return (
    <div className="space-y-5">
      {list.length === 0 && !admins.loading ? (
        <EmptyState compact icon="fa-user-plus" title="Ban này chưa có tài khoản" desc="Tạo tài khoản bên dưới để ban tự quản lý dữ liệu của mình." />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {list.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-xs font-black flex items-center justify-center">
                {(a.displayName || a.username).slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-sm font-bold text-slate-800 truncate">{a.displayName}</p>
                <p className="text-[11px] text-slate-500">
                  @{a.username} · {a.lastLoginAt ? `đăng nhập ${fmtDateTime(a.lastLoginAt)}` : 'chưa đăng nhập'}
                </p>
              </div>
              <IconButton icon="fa-key" label="Đặt lại mật khẩu" onClick={() => { setResetFor(a); setNewPw(''); }} />
              <IconButton icon="fa-trash" tone="danger" label="Xoá tài khoản" onClick={() => remove(a)} />
            </li>
          ))}
        </ul>
      )}

      {resetFor && (
        <form onSubmit={resetPassword} className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
          <p className="text-sm font-bold text-slate-800">Đặt lại mật khẩu cho @{resetFor.username}</p>
          <TextInput type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Mật khẩu mới (ít nhất 6 ký tự)" autoFocus />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setResetFor(null)}>
              Huỷ
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={newPw.length < 6}>
              Đặt lại
            </Button>
          </div>
        </form>
      )}

      <form onSubmit={create} className="rounded-xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-extrabold text-slate-800">
          <i className="fa-solid fa-user-plus mr-2 text-sky-600"></i>Thêm tài khoản cho ban
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Tên đăng nhập" required>
            <TextInput value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="vd: titop" required />
          </Field>
          <Field label="Tên hiển thị">
            <TextInput value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="vd: Admin Ti Tốp" />
          </Field>
        </div>
        <Field label="Mật khẩu" required hint="Ít nhất 6 ký tự">
          <TextInput type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" icon="fa-plus" loading={saving} disabled={!form.username || form.password.length < 6}>
            Tạo tài khoản
          </Button>
        </div>
      </form>
    </div>
  );
};

// ---------- Trang ----------
type Dialog = { kind: 'form'; tenant: Tenant | null } | { kind: 'sites'; tenant: Tenant } | { kind: 'admins'; tenant: Tenant } | null;

const TenantsPage: React.FC = () => {
  const { handleError } = useAdmin();
  const toast = useToast();
  const confirm = useConfirm();
  const tenants = useResource(() => adminApi.listTenants(), []);
  const sites = useResource(() => adminApi.listSites(), []);
  const [dialog, setDialog] = useState<Dialog>(null);
  const siteName = useMemo(() => new Map((sites.data || []).map((s) => [s.id, s.nameVi])), [sites.data]);
  const all = tenants.data || [];

  // Danh sách ban đổi (tạo / sửa) thì cập nhật luôn bản đang mở trong hộp thoại.
  useEffect(() => {
    if (dialog && dialog.kind !== 'form') {
      const fresh = all.find((t) => t.id === dialog.tenant.id);
      if (fresh && fresh !== dialog.tenant) setDialog({ ...dialog, tenant: fresh });
    }
  }, [all, dialog]);

  const upsert = (t: Tenant) => tenants.setData((l) => {
    const list = l || [];
    return list.some((x) => x.id === t.id) ? list.map((x) => (x.id === t.id ? t : x)) : [...list, t];
  });

  const toggleActive = async (t: Tenant, v: boolean) => {
    try {
      upsert(await adminApi.updateTenant(t.id, { isActive: v }));
      toast.success(v ? 'Đã mở khoá ban quản lý' : 'Đã khoá ban quản lý', t.name);
    } catch (err) {
      handleError(err);
    }
  };

  const remove = async (t: Tenant) => {
    if (!(await confirm({
      title: 'Xoá ban quản lý?',
      message: <>Ban <b>{t.name}</b> và các tài khoản của ban sẽ bị xoá. Ban phải không còn địa điểm, gói vé hay mã kích hoạt.</>,
      confirmText: 'Xoá ban'
    })))
      return;
    try {
      await adminApi.deleteTenant(t.id);
      tenants.setData((l) => (l || []).filter((x) => x.id !== t.id));
      toast.success('Đã xoá ban quản lý', t.name);
    } catch (err) {
      handleError(err, 'Không xoá được ban quản lý');
    }
  };

  const columns: Column<Tenant>[] = [
    {
      key: 'name',
      header: 'Ban quản lý',
      sortValue: (t) => t.name,
      render: (t) => (
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-slate-900 truncate">
            {t.name} {t.isDefault && <Badge tone="sky" className="ml-1">Mặc định</Badge>}
          </p>
          <p className="text-[11px] font-mono text-slate-500">{t.slug}</p>
        </div>
      )
    },
    {
      key: 'sites',
      header: 'Địa điểm',
      sortValue: (t) => t.siteCount,
      render: (t) => (
        <div className="max-w-[260px]">
          <Badge tone="teal" icon="fa-location-dot">{fmtNum(t.siteCount)} điểm</Badge>
          <span className="block text-[11px] text-slate-500 mt-0.5 truncate">{t.siteIds.map((id) => siteName.get(id) || `#${id}`).join(', ')}</span>
        </div>
      )
    },
    {
      key: 'admins',
      header: 'Tài khoản',
      align: 'center',
      sortValue: (t) => t.adminCount,
      render: (t) => <span className="text-sm font-bold text-slate-700">{fmtNum(t.adminCount)}</span>
    },
    {
      key: 'data',
      header: 'Gói vé · Mã',
      align: 'center',
      hideOnMobile: true,
      render: (t) => <span className="text-xs text-slate-600">{fmtNum(t.packageCount)} · {fmtNum(t.codeCount)}</span>
    },
    {
      key: 'active',
      header: 'Hoạt động',
      render: (t) => <Toggle size="sm" checked={t.isActive} disabled={t.isDefault} onChange={(v) => toggleActive(t, v)} />
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (t) => (
        <div className="flex justify-end gap-1">
          <IconButton icon="fa-pen" label="Sửa" onClick={() => setDialog({ kind: 'form', tenant: t })} />
          <IconButton icon="fa-map-location-dot" label="Gán địa điểm" onClick={() => setDialog({ kind: 'sites', tenant: t })} />
          <IconButton icon="fa-users" label="Tài khoản" onClick={() => setDialog({ kind: 'admins', tenant: t })} />
          {!t.isDefault && <IconButton icon="fa-trash" tone="danger" label="Xoá" onClick={() => remove(t)} />}
        </div>
      )
    }
  ];

  return (
    <>
      <PageHeader
        title="Ban quản lý"
        desc="Mỗi ban quản lý sở hữu một số địa điểm. Tài khoản của ban chỉ thấy địa điểm, gói vé, mã kích hoạt, đơn hàng và số liệu của ban mình."
        actions={
          <Button variant="primary" icon="fa-plus" onClick={() => setDialog({ kind: 'form', tenant: null })}>
            Thêm ban quản lý
          </Button>
        }
      />
      <Card noPadding>
        <DataTable columns={columns} rows={tenants.data} rowKey={(t) => t.id} loading={tenants.loading} searchText={(t) => `${t.name} ${t.slug}`} searchPlaceholder="Tìm ban quản lý…" />
      </Card>
      <p className="mt-4 text-[12px] text-slate-500 leading-relaxed">
        <i className="fa-solid fa-circle-info mr-1.5 text-sky-500"></i>
        Mô hình multi-tenant <b>shared database, shared schema</b>: các bảng sites, packages, claim_codes có cột <code>tenant_id</code>; đơn hàng, lượt nghe và
        khách truy cập thuộc ban thông qua địa điểm. Tài khoản quản trị nền tảng (không thuộc ban nào) thấy toàn bộ.
      </p>

      <Modal
        open={dialog?.kind === 'form'}
        onClose={() => setDialog(null)}
        title={dialog?.kind === 'form' && dialog.tenant ? 'Sửa ban quản lý' : 'Thêm ban quản lý'}
        icon="fa-building-user"
        size="sm"
      >
        {dialog?.kind === 'form' && (
          <TenantForm
            tenant={dialog.tenant}
            onClose={() => setDialog(null)}
            onSaved={(t) => {
              upsert(t);
              setDialog(null);
            }}
          />
        )}
      </Modal>
      <Modal open={dialog?.kind === 'sites'} onClose={() => setDialog(null)} title="Gán địa điểm" subtitle={dialog?.kind === 'sites' ? dialog.tenant.name : ''} icon="fa-map-location-dot" size="lg">
        {dialog?.kind === 'sites' && (
          <SitesForm
            tenant={dialog.tenant}
            tenants={all}
            onClose={() => setDialog(null)}
            onSaved={() => {
              tenants.reload();
              sites.reload();
              setDialog(null);
            }}
          />
        )}
      </Modal>
      <Modal open={dialog?.kind === 'admins'} onClose={() => setDialog(null)} title="Tài khoản của ban" subtitle={dialog?.kind === 'admins' ? dialog.tenant.name : ''} icon="fa-users" size="lg">
        {dialog?.kind === 'admins' && <AdminsPanel tenant={dialog.tenant} onChanged={() => tenants.reload()} />}
      </Modal>
    </>
  );
};

export default TenantsPage;
