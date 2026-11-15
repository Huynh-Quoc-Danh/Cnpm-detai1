import React, { useState } from 'react';
import { adminApi } from '../../services/api';
import { useAdmin } from '../AdminContext';
import { Field, TextInput } from './FormField';
import { useToast } from './Toasts';
import { Button } from './ui';

export const ChangePasswordForm: React.FC<{ onDone?: () => void; compact?: boolean }> = ({ onDone, compact }) => {
  const { handleError } = useAdmin();
  const toast = useToast();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const strength = newPw.length >= 12 && /\d/.test(newPw) && /[A-Za-z]/.test(newPw) ? 3 : newPw.length >= 8 ? 2 : newPw.length >= 6 ? 1 : 0;
  const strengthLabel = ['Quá ngắn', 'Yếu', 'Khá', 'Mạnh'][strength];
  const strengthColor = ['bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-emerald-500'][strength];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (newPw.length < 6) return setErr('Mật khẩu mới cần ít nhất 6 ký tự');
    if (newPw !== confirmPw) return setErr('Xác nhận mật khẩu không khớp');
    setBusy(true);
    try {
      await adminApi.changePassword(oldPw, newPw);
      toast.success('Đã đổi mật khẩu', 'Các phiên đăng nhập khác đã bị đăng xuất.');
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
      onDone?.();
    } catch (e: any) {
      if (e?.status === 400) setErr(e.message || 'Mật khẩu hiện tại không đúng');
      else handleError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Mật khẩu hiện tại" required>
        <TextInput type={show ? 'text' : 'password'} value={oldPw} onChange={(e) => setOldPw(e.target.value)} autoComplete="current-password" icon="fa-lock" required />
      </Field>
      <div className={compact ? 'space-y-4' : 'grid sm:grid-cols-2 gap-4'}>
        <Field label="Mật khẩu mới" required>
          <TextInput type={show ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" icon="fa-key" required />
          {newPw && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 grid grid-cols-3 gap-1">
                {[1, 2, 3].map((i) => (
                  <span key={i} className={'h-1 rounded-full ' + (strength >= i ? strengthColor : 'bg-slate-200')} />
                ))}
              </div>
              <span className="text-[11px] font-semibold text-slate-500">{strengthLabel}</span>
            </div>
          )}
        </Field>
        <Field label="Nhập lại mật khẩu mới" required>
          <TextInput
            type={show ? 'text' : 'password'}
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            autoComplete="new-password"
            icon="fa-key"
            invalid={!!confirmPw && confirmPw !== newPw}
            required
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="rounded" /> Hiện mật khẩu
      </label>
      {err && (
        <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
          {err}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" variant="primary" icon="fa-shield-halved" loading={busy}>
          Cập nhật mật khẩu
        </Button>
      </div>
    </form>
  );
};
