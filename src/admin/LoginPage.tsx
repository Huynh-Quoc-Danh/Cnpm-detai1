import React, { useState } from 'react';
import type { AdminUser } from '../types';
import { adminApi } from '../services/api';
import { cx } from './utils';

const HERO = encodeURI('/image/VinhHaLong.jpg');

const FEATURES = [
  { icon: 'fa-satellite-dish', title: 'Giám sát khách theo thời gian thực', desc: 'Biết chính xác có bao nhiêu khách đang ở từng điểm.' },
  { icon: 'fa-chart-line', title: 'Doanh thu theo ngày · tuần · tháng', desc: 'Thống kê vé bán, lượt nghe và tỉ lệ chuyển đổi.' },
  { icon: 'fa-qrcode', title: 'QR thanh toán & mở khoá thuyết minh', desc: 'Quản lý điểm tham quan, gói vé và mã kích hoạt.' }
];

export const LoginPage: React.FC<{ onSuccess: (a: AdminUser) => void; notice?: string | null }> = ({ onSuccess, notice }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!username.trim() || !password) return setErr('Vui lòng nhập tên đăng nhập và mật khẩu');
    setBusy(true);
    try {
      const r = await adminApi.login(username.trim(), password);
      onSuccess(r.admin);
    } catch (e: any) {
      setErr(e?.status === 401 ? 'Sai tên đăng nhập hoặc mật khẩu' : e?.message || 'Không thể đăng nhập');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-white">
      {/* Bên trái: thương hiệu */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-white">
        <img src={HERO} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-sky-900/75 to-teal-700/60" />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center">
            <i className="fa-solid fa-water text-lg"></i>
          </div>
          <div className="leading-tight">
            <p className="font-extrabold">Hạ Long SmartGuide</p>
            <p className="text-xs text-sky-100/80">Admin Portal · Quản trị hệ thống</p>
          </div>
        </div>
        <div className="relative max-w-lg">
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-200 mb-4">
            <span className="w-6 h-px bg-teal-200"></span>Di sản thiên nhiên thế giới
          </p>
          <h1 className="text-4xl xl:text-5xl font-black leading-[1.08] tracking-tight">
            Vận hành hệ thống
            <br />
            thuyết minh thông minh
            <br />
            <span className="bg-gradient-to-r from-sky-300 to-teal-200 bg-clip-text text-transparent">Vịnh Hạ Long</span>
          </h1>
          <ul className="mt-10 space-y-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-4">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-white/10 border border-white/15 backdrop-blur flex items-center justify-center">
                  <i className={cx('fa-solid text-sm text-sky-200', f.icon)}></i>
                </div>
                <div>
                  <p className="font-bold text-sm">{f.title}</p>
                  <p className="text-xs text-sky-100/75 mt-0.5">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[11px] text-sky-100/60">© {new Date().getFullYear()} Hạ Long SmartGuide · Đồ án phát triển hệ thống du lịch thông minh</p>
      </div>

      {/* Bên phải: biểu mẫu */}
      <div className="flex items-center justify-center px-5 py-12 sm:px-10 bg-gradient-to-b from-slate-50 to-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-sky-600/25">
              <i className="fa-solid fa-water"></i>
            </div>
            <div className="leading-tight">
              <p className="font-extrabold text-slate-900">Hạ Long SmartGuide</p>
              <p className="text-xs text-slate-500">Admin Portal</p>
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Đăng nhập quản trị</h2>
          <p className="text-sm text-slate-500 mt-1.5">Chào mừng trở lại! Vui lòng đăng nhập để tiếp tục.</p>

          {notice && (
            <div className="mt-6 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
              <i className="fa-solid fa-circle-info mr-1.5"></i>
              {notice}
            </div>
          )}

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Tên đăng nhập</label>
              <div className="relative mt-1.5">
                <i className="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Mật khẩu</label>
              <div className="relative mt-1.5">
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-11 py-3 text-sm focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700"
                  aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <i className={cx('fa-solid text-xs', show ? 'fa-eye-slash' : 'fa-eye')}></i>
                </button>
              </div>
            </div>
            {err && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5">
                <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-teal-500 shadow-lg shadow-sky-600/25 hover:brightness-105 disabled:opacity-60 transition"
            >
              {busy ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-arrow-right-to-bracket"></i>}
              {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] text-slate-400">
            Tài khoản mặc định: <span className="font-mono font-semibold text-slate-500">admin / admin123</span> — hãy đổi mật khẩu sau khi đăng nhập.
          </p>
          <p className="mt-8 text-center">
            <a href="/" className="text-xs font-semibold text-sky-700 hover:underline">
              <i className="fa-solid fa-arrow-left mr-1"></i>Về ứng dụng khách tham quan
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
