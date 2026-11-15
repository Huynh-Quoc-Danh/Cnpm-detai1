import React, { useEffect, useState } from 'react';
import type { AdminSettings } from '../../types';
import { adminApi, api } from '../../services/api';
import { useAdmin } from '../AdminContext';
import { useResource } from '../hooks';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import { Field, NumberInput, Select, TextInput } from '../components/FormField';
import { useToast } from '../components/Toasts';
import { Badge, Button, Card, PageHeader, Skeleton, Toggle } from '../components/ui';
import { cx } from '../utils';

const BANKS = [
  { id: 'VCB', name: 'Vietcombank' },
  { id: 'MB', name: 'MB Bank' },
  { id: 'TCB', name: 'Techcombank' },
  { id: 'BIDV', name: 'BIDV' },
  { id: 'ICB', name: 'VietinBank' },
  { id: 'VBA', name: 'Agribank' },
  { id: 'ACB', name: 'ACB' },
  { id: 'VPB', name: 'VPBank' },
  { id: 'TPB', name: 'TPBank' },
  { id: 'STB', name: 'Sacombank' },
  { id: 'VIB', name: 'VIB' },
  { id: 'SHB', name: 'SHB' },
  { id: 'HDB', name: 'HDBank' },
  { id: 'OCB', name: 'OCB' }
];

const SettingsPage: React.FC = () => {
  const { handleError, setSettings: setCtxSettings, admin } = useAdmin();
  const toast = useToast();
  const remote = useResource(() => adminApi.getSettings(), []);
  const network = useResource(() => api.getNetwork(), []);
  const health = useResource(() => fetch('/api/health').then((r) => r.json()) as Promise<{ ok: boolean; sites: number; time: string }>, []);
  const [d, setD] = useState<AdminSettings | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (remote.data) setD({ ...remote.data, publicBaseUrl: remote.data.publicBaseUrl || '' });
  }, [remote.data]);

  const save = async (section: string, patch: Partial<AdminSettings>) => {
    setBusy(section);
    try {
      const s = await adminApi.updateSettings(patch);
      remote.setData(s);
      setCtxSettings(s);
      toast.success('Đã lưu cài đặt');
    } catch (e) {
      handleError(e, 'Không lưu được cài đặt');
    } finally {
      setBusy(null);
    }
  };

  const set = (patch: Partial<AdminSettings>) => setD((x) => (x ? { ...x, ...patch } : x));
  const setBank = (patch: Partial<AdminSettings['bank']>) => setD((x) => (x ? { ...x, bank: { ...x.bank, ...patch } } : x));

  const vietqrPreview = d?.bank.bankId && d.bank.accountNo
    ? `https://img.vietqr.io/image/${encodeURIComponent(d.bank.bankId)}-${encodeURIComponent(d.bank.accountNo)}-compact2.png?amount=99000&addInfo=${encodeURIComponent('HLSG DEMO')}&accountName=${encodeURIComponent(d.bank.accountName)}`
    : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Cài đặt hệ thống" desc="Cấu hình địa chỉ công khai cho mã QR, thời lượng nghe thử, tài khoản nhận thanh toán và dữ liệu mô phỏng." />

      {!d ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          {/* URL công khai */}
          <Card title="Địa chỉ công khai (ngrok)" subtitle="Dùng cho mọi mã QR và liên kết thanh toán" icon="fa-globe">
            <div className="space-y-4">
              <Field
                label="URL công khai"
                hint={
                  <>
                    Chạy <code className="font-mono bg-slate-100 px-1 rounded">npm run build && npm start</code> rồi{' '}
                    <code className="font-mono bg-slate-100 px-1 rounded">ngrok http 3001</code>, sao chép địa chỉ dạng{' '}
                    <span className="font-mono">https://xxxx.ngrok-free.app</span> dán vào đây. Bỏ trống để tự dùng địa chỉ LAN.
                  </>
                }
              >
                <TextInput icon="fa-link" value={d.publicBaseUrl || ''} onChange={(e) => set({ publicBaseUrl: e.target.value })} placeholder="https://xxxx.ngrok-free.app" className="font-mono" />
              </Field>
              {(network.data?.lanUrls || []).length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-1.5">Địa chỉ LAN phát hiện được (điện thoại cùng Wi-Fi):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {network.data!.lanUrls.map((u) => (
                      <button
                        key={u}
                        onClick={() => set({ publicBaseUrl: u })}
                        className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-700 transition"
                      >
                        <i className="fa-solid fa-wifi mr-1 text-[9px]"></i>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2 justify-end pt-1">
                {remote.data?.publicBaseUrl && (
                  <Button variant="ghost" icon="fa-eraser" disabled={busy === 'url'} onClick={() => save('url', { publicBaseUrl: null })}>
                    Xoá URL
                  </Button>
                )}
                <Button variant="primary" icon="fa-floppy-disk" loading={busy === 'url'} onClick={() => save('url', { publicBaseUrl: (d.publicBaseUrl || '').trim() || null })}>
                  Lưu địa chỉ
                </Button>
              </div>
            </div>
          </Card>

          {/* Nghe thử + mô phỏng */}
          <Card title="Thuyết minh & dữ liệu trình diễn" subtitle="Giới hạn nghe thử và khách mô phỏng" icon="fa-sliders">
            <div className="space-y-5">
              <Field label="Thời lượng nghe thử miễn phí" hint="Khách chưa mua vé nghe được bấy nhiêu giây đầu, sau đó ứng dụng yêu cầu thanh toán (5–300 giây).">
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={5}
                    max={120}
                    step={5}
                    value={Math.min(120, d.previewSeconds)}
                    onChange={(e) => set({ previewSeconds: Number(e.target.value) })}
                    className="flex-1 accent-sky-600"
                  />
                  <div className="w-28">
                    <NumberInput value={d.previewSeconds} onChange={(v) => set({ previewSeconds: v === '' ? 30 : Math.min(300, Math.max(5, Math.round(v))) })} suffix="giây" />
                  </div>
                </div>
              </Field>
              <div className={cx('rounded-2xl border p-4 flex gap-4', d.simulateVisitors ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-slate-50')}>
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-amber-600 shadow-sm shrink-0">
                  <i className="fa-solid fa-robot"></i>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-slate-900">Khách tham quan mô phỏng</p>
                    <Toggle checked={d.simulateVisitors} onChange={(v) => set({ simulateVisitors: v })} />
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Tạo 8–25 khách ảo di chuyển giữa các điểm để trình diễn bảng giám sát. Mọi số liệu mô phỏng đều được gắn nhãn <b>“mô phỏng”</b>. Tắt khi vận hành
                    thật – khách ảo biến mất ngay.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  icon="fa-floppy-disk"
                  loading={busy === 'audio'}
                  onClick={() => save('audio', { previewSeconds: d.previewSeconds, simulateVisitors: d.simulateVisitors })}
                >
                  Lưu thiết lập
                </Button>
              </div>
            </div>
          </Card>

          {/* Ngân hàng */}
          <Card title="Tài khoản nhận thanh toán VietQR" subtitle="Hiển thị mã chuyển khoản có sẵn số tiền & nội dung trên trang thanh toán" icon="fa-building-columns">
            <div className="grid sm:grid-cols-[1fr_auto] gap-5">
              <div className="space-y-4">
                <Field label="Ngân hàng">
                  <Select value={d.bank.bankId} onChange={(e) => setBank({ bankId: e.target.value })}>
                    {!BANKS.some((b) => b.id === d.bank.bankId) && <option value={d.bank.bankId}>{d.bank.bankId}</option>}
                    {BANKS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.id})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Số tài khoản">
                  <TextInput value={d.bank.accountNo} onChange={(e) => setBank({ accountNo: e.target.value.replace(/\s/g, '') })} className="font-mono" inputMode="numeric" />
                </Field>
                <Field label="Tên chủ tài khoản" hint="Viết hoa, không dấu – đúng như trên ngân hàng">
                  <TextInput
                    value={d.bank.accountName}
                    onChange={(e) =>
                      setBank({
                        accountName: e.target.value
                          .normalize('NFD')
                          .replace(/[̀-ͯ]/g, '')
                          .replace(/đ/g, 'd')
                          .replace(/Đ/g, 'D')
                          .toUpperCase()
                      })
                    }
                  />
                </Field>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                  {vietqrPreview ? (
                    <img src={vietqrPreview} alt="VietQR mẫu" className="w-full rounded-xl" onError={(e) => (e.currentTarget.style.opacity = '0.2')} />
                  ) : (
                    <div className="aspect-square flex items-center justify-center text-slate-300">
                      <i className="fa-solid fa-qrcode text-4xl"></i>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-center">Mẫu VietQR 99.000 ₫ (cần Internet)</p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="primary" icon="fa-floppy-disk" loading={busy === 'bank'} onClick={() => save('bank', { bank: d.bank })}>
                Lưu tài khoản
              </Button>
            </div>
          </Card>

          {/* Bảo mật */}
          <Card title="Bảo mật tài khoản" subtitle={`Đăng nhập với @${admin.username}`} icon="fa-shield-halved">
            <ChangePasswordForm />
          </Card>

          {/* Hệ thống */}
          <Card title="Thông tin hệ thống" icon="fa-server" className="xl:col-span-2">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <Info label="Trạng thái API">
                {health.data?.ok ? (
                  <Badge tone="green" dot>
                    Hoạt động
                  </Badge>
                ) : health.loading ? (
                  '…'
                ) : (
                  <Badge tone="red" dot>
                    Mất kết nối
                  </Badge>
                )}
              </Info>
              <Info label="Số địa điểm">{health.data?.sites ?? '…'}</Info>
              <Info label="Kiến trúc">Express 3 lớp · SQLite</Info>
              <Info label="Múi giờ báo cáo">Asia/Ho_Chi_Minh (UTC+7)</Info>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

const Info: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}</p>
    <div className="font-bold text-slate-900 mt-1">{children}</div>
  </div>
);

export default SettingsPage;
