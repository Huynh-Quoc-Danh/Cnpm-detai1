import React, { useState } from 'react';
import type { TicketPackage } from '../../types';
import { adminApi } from '../../services/api';
import { useAdmin } from '../AdminContext';
import { useResource } from '../hooks';
import { Modal } from '../components/Modal';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toasts';
import { BilingualRow, Field, LangTag, NumberInput, Select, TextArea, TextInput } from '../components/FormField';
import { Badge, Button, EmptyState, IconButton, PageHeader, Skeleton, Toggle } from '../components/ui';
import { cx, fmtHours, formatVnd } from '../utils';

const blank = (): Partial<TicketPackage> => ({
  code: '',
  nameVi: '',
  nameEn: '',
  descVi: '',
  descEn: '',
  price: 49000,
  scope: 'all',
  durationHours: 24,
  maxPeople: 1,
  isActive: true,
  badgeVi: '',
  badgeEn: ''
});

const PackagesPage: React.FC = () => {
  const { handleError } = useAdmin();
  const toast = useToast();
  const confirm = useConfirm();
  const pkgs = useResource(() => adminApi.listPackages(), []);
  const [edit, setEdit] = useState<{ open: boolean; pkg: TicketPackage | null }>({ open: false, pkg: null });

  const list = [...(pkgs.data || [])].sort((a, b) => (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id));

  const toggle = async (p: TicketPackage, v: boolean) => {
    try {
      const u = await adminApi.updatePackage(p.id, { isActive: v });
      pkgs.setData((l) => (l || []).map((x) => (x.id === p.id ? u : x)));
      toast.success(v ? 'Đã mở bán gói vé' : 'Đã ngừng bán gói vé', p.nameVi);
    } catch (e) {
      handleError(e);
    }
  };

  const remove = async (p: TicketPackage) => {
    if (
      !(await confirm({
        title: 'Xoá gói vé?',
        message: (
          <>
            Gói <b>{p.nameVi}</b> sẽ bị xoá. Các đơn hàng cũ vẫn giữ tên gói. Nếu chỉ muốn tạm ngừng bán, hãy tắt công tắc <b>Đang bán</b>.
          </>
        ),
        confirmText: 'Xoá gói'
      }))
    )
      return;
    try {
      await adminApi.deletePackage(p.id);
      pkgs.setData((l) => (l || []).filter((x) => x.id !== p.id));
      toast.success('Đã xoá gói vé', p.nameVi);
    } catch (e) {
      handleError(e, 'Không xoá được gói vé');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gói vé"
        desc="Bảng giá quyền nghe thuyết minh đầy đủ. Khách quét QR tại điểm sẽ thấy các gói đang bán khi hết phần nghe thử."
        actions={
          <Button variant="primary" icon="fa-plus" onClick={() => setEdit({ open: true, pkg: null })}>
            Thêm gói vé
          </Button>
        }
      />

      {pkgs.loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 rounded-3xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200">
          <EmptyState icon="fa-ticket" title="Chưa có gói vé" desc="Tạo gói đầu tiên để khách có thể mua quyền nghe." />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {list.map((p) => (
            <div
              key={p.id}
              className={cx(
                'relative bg-white rounded-3xl border shadow-sm flex flex-col overflow-hidden transition',
                p.badgeVi ? 'border-sky-300 ring-4 ring-sky-500/5' : 'border-slate-200',
                !p.isActive && 'opacity-60'
              )}
            >
              {p.badgeVi && (
                <div className="absolute top-4 right-4">
                  <Badge tone="sky" icon="fa-star">
                    {p.badgeVi}
                  </Badge>
                </div>
              )}
              <div className="p-6 flex-1">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-50 to-teal-50 border border-sky-100 text-sky-600 flex items-center justify-center mb-4">
                  <i className={cx('fa-solid', p.scope === 'all' ? ((p.maxPeople || 1) > 1 ? 'fa-people-group' : 'fa-earth-asia') : 'fa-location-dot')}></i>
                </div>
                <p className="text-[11px] font-mono font-bold text-slate-400">{p.code}</p>
                <h3 className="text-lg font-black text-slate-900 leading-tight">{p.nameVi}</h3>
                <p className="text-xs text-slate-500">{p.nameEn}</p>
                <p className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black tracking-tight text-slate-900 tabular-nums">{formatVnd(p.price)}</span>
                </p>
                <p className="text-sm text-slate-600 mt-3 leading-relaxed min-h-[40px]">{p.descVi}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  <li className="flex items-center gap-2">
                    <i className="fa-solid fa-check text-emerald-500 text-xs w-4"></i>
                    {p.scope === 'all' ? 'Mở khoá tất cả địa điểm' : 'Mở khoá 1 địa điểm đã quét'}
                  </li>
                  <li className="flex items-center gap-2">
                    <i className="fa-solid fa-check text-emerald-500 text-xs w-4"></i>Hiệu lực {fmtHours(p.durationHours)}
                  </li>
                  <li className="flex items-center gap-2">
                    <i className="fa-solid fa-check text-emerald-500 text-xs w-4"></i>
                    {(p.maxPeople || 1) > 1 ? `Dùng cho tối đa ${p.maxPeople} người` : 'Dùng cho 1 người'}
                  </li>
                </ul>
              </div>
              <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center gap-2">
                <Toggle size="sm" checked={p.isActive} onChange={(v) => toggle(p, v)} label={<span className="text-xs">{p.isActive ? 'Đang bán' : 'Ngừng bán'}</span>} />
                <div className="ml-auto flex">
                  <IconButton icon="fa-pen-to-square" label="Sửa" onClick={() => setEdit({ open: true, pkg: p })} />
                  <IconButton icon="fa-trash-can" label="Xoá" tone="danger" onClick={() => remove(p)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PackageEditor
        open={edit.open}
        pkg={edit.pkg}
        nextOrder={list.length + 1}
        onClose={() => setEdit({ open: false, pkg: null })}
        onSaved={(p) => {
          pkgs.setData((l) => {
            const arr = l || [];
            return arr.some((x) => x.id === p.id) ? arr.map((x) => (x.id === p.id ? p : x)) : [...arr, p];
          });
          setEdit({ open: false, pkg: null });
        }}
      />
    </div>
  );
};

const PackageEditor: React.FC<{ open: boolean; pkg: TicketPackage | null; nextOrder: number; onClose: () => void; onSaved: (p: TicketPackage) => void }> = ({
  open,
  pkg,
  nextOrder,
  onClose,
  onSaved
}) => {
  const { handleError } = useAdmin();
  const toast = useToast();
  const [d, setD] = useState<Partial<TicketPackage>>(blank);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setD(pkg ? { ...pkg, badgeVi: pkg.badgeVi || '', badgeEn: pkg.badgeEn || '' } : { ...blank(), sortOrder: nextOrder });
      setErr(null);
    }
  }, [open, pkg, nextOrder]);

  const set = <K extends keyof TicketPackage>(k: K, v: TicketPackage[K]) => setD((x) => ({ ...x, [k]: v }));

  const save = async () => {
    if (!d.code || !/^[A-Za-z0-9_-]{2,32}$/.test(d.code)) return setErr('Mã gói 2–32 ký tự: chữ, số, _ hoặc -');
    if (!d.nameVi?.trim()) return setErr('Vui lòng nhập tên gói (Tiếng Việt)');
    if (!(Number(d.price) >= 0)) return setErr('Giá không hợp lệ');
    if (!(Number(d.durationHours) > 0)) return setErr('Thời hạn phải lớn hơn 0');
    setBusy(true);
    setErr(null);
    try {
      const payload = { ...d, code: d.code.toUpperCase(), nameEn: d.nameEn || d.nameVi, badgeVi: d.badgeVi || null, badgeEn: d.badgeEn || null };
      const saved = pkg ? await adminApi.updatePackage(pkg.id, payload) : await adminApi.createPackage(payload);
      toast.success(pkg ? 'Đã cập nhật gói vé' : 'Đã thêm gói vé', saved.nameVi);
      onSaved(saved);
    } catch (e: any) {
      if (e?.status === 409 || e?.status === 400) setErr(e.message);
      else handleError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="fa-ticket"
      size="lg"
      title={pkg ? 'Sửa gói vé' : 'Thêm gói vé'}
      footer={
        <>
          {err && <span className="mr-auto self-center text-xs font-semibold text-rose-600">{err}</span>}
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" icon="fa-check" loading={busy} onClick={save}>
            Lưu gói vé
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Mã gói" required hint="VD: ALL_DAY">
            <TextInput value={d.code || ''} onChange={(e) => set('code', e.target.value.toUpperCase())} className="font-mono" disabled={!!pkg} />
          </Field>
          <Field label="Giá bán" required>
            <NumberInput value={d.price ?? ''} onChange={(v) => set('price', v === '' ? 0 : Math.max(0, Math.round(v)))} step={1000} suffix="₫" />
          </Field>
          <Field label="Phạm vi">
            <Select value={d.scope} onChange={(e) => set('scope', e.target.value as any)}>
              <option value="all">Tất cả địa điểm</option>
              <option value="site">1 địa điểm (nơi quét QR)</option>
            </Select>
          </Field>
          <Field label="Thời hạn" required>
            <NumberInput value={d.durationHours ?? ''} onChange={(v) => set('durationHours', v === '' ? 0 : Math.max(1, Math.round(v)))} suffix="giờ" />
          </Field>
          <Field label="Số người tối đa">
            <NumberInput value={d.maxPeople ?? 1} onChange={(v) => set('maxPeople', v === '' ? 1 : Math.max(1, Math.round(v)))} suffix="người" />
          </Field>
          <Field label="Thứ tự hiển thị">
            <NumberInput value={d.sortOrder ?? ''} onChange={(v) => set('sortOrder', v === '' ? undefined : Math.round(v))} />
          </Field>
        </div>
        <BilingualRow>
          <Field label={<>Tên gói<LangTag lang="vi" /></>} required>
            <TextInput value={d.nameVi || ''} onChange={(e) => set('nameVi', e.target.value)} placeholder="Vé ngày – Toàn vịnh" />
          </Field>
          <Field label={<>Tên gói<LangTag lang="en" /></>}>
            <TextInput value={d.nameEn || ''} onChange={(e) => set('nameEn', e.target.value)} placeholder="All-day bay pass" />
          </Field>
        </BilingualRow>
        <BilingualRow>
          <Field label={<>Mô tả<LangTag lang="vi" /></>}>
            <TextArea rows={3} value={d.descVi || ''} onChange={(e) => set('descVi', e.target.value)} />
          </Field>
          <Field label={<>Mô tả<LangTag lang="en" /></>}>
            <TextArea rows={3} value={d.descEn || ''} onChange={(e) => set('descEn', e.target.value)} />
          </Field>
        </BilingualRow>
        <BilingualRow>
          <Field label={<>Nhãn nổi bật<LangTag lang="vi" /></>} hint="VD: Phổ biến nhất · bỏ trống nếu không có">
            <TextInput value={d.badgeVi || ''} onChange={(e) => set('badgeVi', e.target.value)} />
          </Field>
          <Field label={<>Nhãn nổi bật<LangTag lang="en" /></>}>
            <TextInput value={d.badgeEn || ''} onChange={(e) => set('badgeEn', e.target.value)} />
          </Field>
        </BilingualRow>
        <Toggle checked={!!d.isActive} onChange={(v) => set('isActive', v)} label="Đang mở bán" />
      </div>
    </Modal>
  );
};

export default PackagesPage;
