import React from 'react';
import type { AdminUser } from '../../types';
import { NAV_GROUPS, canSee, isSuperAdmin, type AdminPage } from '../routes';
import { cx, fmtNum } from '../utils';

interface SidebarProps {
  page: AdminPage;
  onNavigate: (p: AdminPage) => void;
  open: boolean;
  onClose: () => void;
  admin: AdminUser;
  liveTotal: number | null;
  pendingOrders: number | null;
  simulate: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ page, onNavigate, open, onClose, admin, liveTotal, pendingOrders, simulate }) => {
  const badgeFor = (key: AdminPage) => {
    if (key === 'live' && liveTotal !== null)
      return (
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          {fmtNum(liveTotal)}
        </span>
      );
    if (key === 'orders' && pendingOrders)
      return <span className="ml-auto text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300">{fmtNum(pendingOrders)}</span>;
    return null;
  };

  return (
    <>
      <div
        className={cx('fixed inset-0 z-[1090] bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity print:hidden', open ? 'opacity-100' : 'opacity-0 pointer-events-none')}
        onClick={onClose}
      />
      <aside
        className={cx(
          'fixed z-[1100] inset-y-0 left-0 w-[264px] bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 print:hidden',
          'lg:translate-x-0',
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        )}
      >
        <div className="h-16 shrink-0 flex items-center gap-3 px-5 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-400 flex items-center justify-center shadow-lg shadow-sky-500/30">
            <i className="fa-solid fa-water text-white"></i>
          </div>
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-extrabold text-white truncate">Hạ Long SmartGuide</p>
            <p className="text-[11px] font-semibold text-sky-300/80 truncate" title={admin.tenantName || undefined}>
              · {isSuperAdmin(admin) ? 'Admin Portal' : admin.tenantName || 'Admin Portal'}
            </p>
          </div>
          <button onClick={onClose} className="ml-auto lg:hidden w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10" aria-label="Đóng menu">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 [scrollbar-width:thin]">
          {NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((it) => canSee(it, admin)) }))
            .filter((g) => g.items.length > 0)
            .map((g) => (
            <div key={g.title}>
              <p className="px-3 mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{g.title}</p>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = it.key === page;
                  return (
                    <li key={it.key}>
                      <a
                        href={it.key === 'dashboard' ? '/admin' : `/admin/${it.key}`}
                        onClick={(e) => {
                          if (e.metaKey || e.ctrlKey) return;
                          e.preventDefault();
                          onNavigate(it.key);
                        }}
                        className={cx(
                          'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition',
                          active ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                        )}
                      >
                        {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-sky-400 to-teal-400" />}
                        <i className={cx('fa-solid w-5 text-center text-[13px]', it.icon, active ? 'text-sky-300' : 'text-slate-500 group-hover:text-slate-300')}></i>
                        <span className="truncate">{it.label}</span>
                        {badgeFor(it.key)}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {simulate && (
          <div className="mx-3 mb-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 p-3 text-[11px] text-amber-200/90 leading-relaxed">
            <i className="fa-solid fa-flask mr-1.5"></i>
            Đang bật <b>khách mô phỏng</b> & lịch sử đơn demo để trình diễn.
          </div>
        )}

        <div className="shrink-0 border-t border-white/5 p-3">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <i className="fa-solid fa-arrow-up-right-from-square w-5 text-center"></i>
            Mở ứng dụng khách
          </a>
          <div className="flex items-center gap-3 px-3 pt-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 text-white text-xs font-black flex items-center justify-center ring-2 ring-white/10">
              {(admin.displayName || admin.username).slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-xs font-bold text-white truncate">{admin.displayName || admin.username}</p>
              <p className="text-[10px] text-slate-500 truncate" title={admin.tenantName || undefined}>
                @{admin.username} · {isSuperAdmin(admin) ? 'Quản trị nền tảng' : admin.tenantName || 'Quản trị viên'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
