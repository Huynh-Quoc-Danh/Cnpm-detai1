import React, { useEffect, useRef, useState } from 'react';
import type { AdminUser } from '../../types';
import { navItem, type AdminPage } from '../routes';
import { cx, fmtNum } from '../utils';

interface TopbarProps {
  page: AdminPage;
  admin: AdminUser;
  liveTotal: number | null;
  onMenu: () => void;
  onRefresh: () => void;
  onNavigate: (p: AdminPage) => void;
  onLogout: () => void;
  onChangePassword: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ page, admin, liveTotal, onMenu, onRefresh, onNavigate, onLogout, onChangePassword }) => {
  const item = navItem(page);
  const [menu, setMenu] = useState(false);
  const [spin, setSpin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  const refresh = () => {
    onRefresh();
    setSpin(true);
    window.setTimeout(() => setSpin(false), 700);
  };

  return (
    <header
      className="sticky z-[1000] h-16 bg-white/85 backdrop-blur-md border-b border-slate-200 flex items-center gap-3 px-4 sm:px-6 lg:px-8 print:hidden"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <button onClick={onMenu} className="lg:hidden w-10 h-10 -ml-1 rounded-xl text-slate-600 hover:bg-slate-100" aria-label="Mở menu">
        <i className="fa-solid fa-bars"></i>
      </button>
      <div className="min-w-0">
        <nav className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
          <button onClick={() => onNavigate('dashboard')} className="hover:text-sky-600">
            <i className="fa-solid fa-house text-[10px]"></i> Quản trị
          </button>
          <i className="fa-solid fa-chevron-right text-[8px]"></i>
          <span className="text-slate-500">{item.label}</span>
        </nav>
        <p className="text-sm sm:text-base font-extrabold text-slate-900 truncate leading-tight">{item.label}</p>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => onNavigate('live')}
          className="hidden sm:inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100 transition"
          title="Số khách đang trực tuyến (60 giây gần nhất)"
        >
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping"></span>
            <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500"></span>
          </span>
          Trực tuyến
          <span className="tabular-nums">{liveTotal === null ? '…' : fmtNum(liveTotal)}</span>
        </button>
        <button onClick={refresh} className="w-10 h-10 rounded-xl text-slate-500 hover:text-sky-700 hover:bg-sky-50 transition" title="Làm mới dữ liệu" aria-label="Làm mới dữ liệu">
          <i className={cx('fa-solid fa-rotate-right', spin && 'fa-spin')}></i>
        </button>
        <a href="/" target="_blank" rel="noreferrer" className="hidden md:inline-flex w-10 h-10 items-center justify-center rounded-xl text-slate-500 hover:text-sky-700 hover:bg-sky-50 transition" title="Mở ứng dụng khách" aria-label="Mở ứng dụng khách">
          <i className="fa-solid fa-mobile-screen-button"></i>
        </a>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full hover:bg-slate-100 transition">
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-600 to-teal-500 text-white text-xs font-black flex items-center justify-center">
              {(admin.displayName || admin.username).slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden md:block text-left leading-tight">
              <span className="block text-xs font-bold text-slate-800">{admin.displayName || admin.username}</span>
              <span className="block text-[10px] text-slate-400">@{admin.username}</span>
            </span>
            <i className="fa-solid fa-chevron-down text-[10px] text-slate-400"></i>
          </button>
          {menu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/10 p-1.5 animate-[adminPop_.15s_ease-out]">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-900">{admin.displayName}</p>
                <p className="text-[11px] text-slate-500">Vai trò: {admin.role === 'admin' ? 'Quản trị viên' : admin.role}</p>
              </div>
              <MenuItem icon="fa-gear" label="Cài đặt hệ thống" onClick={() => (setMenu(false), onNavigate('settings'))} />
              <MenuItem icon="fa-key" label="Đổi mật khẩu" onClick={() => (setMenu(false), onChangePassword())} />
              <MenuItem icon="fa-right-from-bracket" label="Đăng xuất" danger onClick={() => (setMenu(false), onLogout())} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const MenuItem: React.FC<{ icon: string; label: string; onClick: () => void; danger?: boolean }> = ({ icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    className={cx(
      'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition',
      danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-100'
    )}
  >
    <i className={cx('fa-solid w-4 text-center text-xs', icon)}></i>
    {label}
  </button>
);
