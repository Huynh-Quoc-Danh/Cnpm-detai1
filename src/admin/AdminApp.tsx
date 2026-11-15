// Cổng quản trị: kiểm tra đăng nhập + bố cục (sidebar/topbar) + điều hướng nội bộ /admin/<page>.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminSettings, AdminUser } from '../types';
import { adminApi, ApiError } from '../services/api';
import { AdminContext, type AdminContextValue } from './AdminContext';
import { LoginPage } from './LoginPage';
import { Sidebar } from './layout/Sidebar';
import { Topbar } from './layout/Topbar';
import { ToastProvider, useToast } from './components/Toasts';
import { ConfirmProvider, useConfirm } from './components/ConfirmDialog';
import { Modal } from './components/Modal';
import { ChangePasswordForm } from './components/ChangePasswordForm';
import { type AdminPage, canSee, navItem, pageFromPath, pathForPage } from './routes';
import DashboardPage from './pages/DashboardPage';
import LivePage from './pages/LivePage';
import SitesPage from './pages/SitesPage';
import OrdersPage from './pages/OrdersPage';
import PackagesPage from './pages/PackagesPage';
import CodesPage from './pages/CodesPage';
import QrCenterPage from './pages/QrCenterPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import TenantsPage from './pages/TenantsPage';
// @ts-ignore CSS không có khai báo kiểu
import './admin.css';

const PAGE_TITLE = 'Admin Portal - Quản Trị Hệ Thống';

const PAGES: Record<AdminPage, React.FC> = {
  dashboard: DashboardPage,
  live: LivePage,
  reports: ReportsPage,
  sites: SitesPage,
  qr: QrCenterPage,
  orders: OrdersPage,
  packages: PackagesPage,
  codes: CodesPage,
  tenants: TenantsPage,
  settings: SettingsPage
};

type AuthState = { status: 'checking' } | { status: 'out'; notice?: string | null } | { status: 'in'; admin: AdminUser };

const AdminApp: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>(() => (adminApi.isLoggedIn() ? { status: 'checking' } : { status: 'out' }));

  useEffect(() => {
    document.title = PAGE_TITLE;
    const prev = document.body.style.background;
    document.body.style.background = '#f8fafc';
    return () => {
      document.body.style.background = prev;
    };
  }, []);

  useEffect(() => {
    if (auth.status !== 'checking') return;
    adminApi
      .me()
      .then((r) => setAuth({ status: 'in', admin: r.admin }))
      .catch((e: ApiError) =>
        setAuth({ status: 'out', notice: e?.status === 401 ? 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' : e?.message || null })
      );
  }, [auth.status]);

  return (
    <div className="admin-root min-h-screen bg-slate-50 text-slate-900">
      <ToastProvider>
        <ConfirmProvider>
          {auth.status === 'checking' && (
            <div className="min-h-screen flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-600 to-teal-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
                  <i className="fa-solid fa-shield-halved text-white animate-pulse"></i>
                </div>
                <span className="text-sm font-semibold">Đang xác thực…</span>
              </div>
            </div>
          )}
          {auth.status === 'out' && <LoginPage notice={auth.notice} onSuccess={(admin) => setAuth({ status: 'in', admin })} />}
          {auth.status === 'in' && (
            <AdminShell
              admin={auth.admin}
              onSignedOut={(notice) => setAuth({ status: 'out', notice })}
              onAdminChange={(admin) => setAuth({ status: 'in', admin })}
            />
          )}
        </ConfirmProvider>
      </ToastProvider>
    </div>
  );
};

const AdminShell: React.FC<{ admin: AdminUser; onSignedOut: (notice?: string | null) => void; onAdminChange: (a: AdminUser) => void }> = ({
  admin,
  onSignedOut
}) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState<AdminPage>(() => pageFromPath());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [liveTotal, setLiveTotal] = useState<number | null>(null);
  const [pendingOrders, setPendingOrders] = useState<number | null>(null);
  const [pwOpen, setPwOpen] = useState(false);

  // Điều hướng
  const navigate = useCallback((p: AdminPage) => {
    const path = pathForPage(p);
    if (window.location.pathname !== path) window.history.pushState({ adminPage: p }, '', path);
    setPage(p);
    setSidebarOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const onPop = () => setPage(pageFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Trang chỉ dành cho quản trị nền tảng: tài khoản của ban quản lý mở thẳng URL thì quay về Tổng quan.
  useEffect(() => {
    if (!canSee(navItem(page), admin)) navigate('dashboard');
  }, [page, admin, navigate]);

  useEffect(() => {
    document.title = PAGE_TITLE;
  }, [page]);

  const signOutExpired = useCallback(() => {
    adminApi.logout();
    onSignedOut('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
  }, [onSignedOut]);

  const handleError = useCallback(
    (err: unknown, fallback?: string) => {
      const e = err as ApiError;
      if (e && (e as any).name === 'AbortError') return;
      if (e?.status === 401) return signOutExpired();
      toast.error(fallback || 'Đã xảy ra lỗi', e?.message || String(err));
    },
    [toast, signOutExpired]
  );

  // Số liệu nền cho sidebar/topbar
  useEffect(() => {
    let alive = true;
    const loadLive = () =>
      adminApi
        .getLive()
        .then((r) => alive && setLiveTotal(r.liveTotal))
        .catch((e) => e?.status === 401 && alive && signOutExpired());
    const loadPending = () =>
      adminApi
        .listOrders({ status: 'pending', pageSize: 1 })
        .then((r) => alive && setPendingOrders(r.total))
        .catch(() => undefined);
    loadLive();
    loadPending();
    const t1 = window.setInterval(() => document.visibilityState === 'visible' && loadLive(), 15000);
    const t2 = window.setInterval(() => document.visibilityState === 'visible' && loadPending(), 30000);
    return () => {
      alive = false;
      window.clearInterval(t1);
      window.clearInterval(t2);
    };
  }, [signOutExpired, refreshKey]);

  useEffect(() => {
    adminApi
      .getSettings()
      .then(setSettings)
      .catch((e) => handleError(e, 'Không tải được cài đặt'));
  }, [handleError]);

  const logout = useCallback(async () => {
    const ok = await confirm({
      title: 'Đăng xuất?',
      message: 'Bạn sẽ cần đăng nhập lại để tiếp tục quản trị hệ thống.',
      confirmText: 'Đăng xuất',
      icon: 'fa-right-from-bracket'
    });
    if (!ok) return;
    await adminApi.logout();
    onSignedOut(null);
  }, [confirm, onSignedOut]);

  const ctx = useMemo<AdminContextValue>(
    () => ({
      admin,
      page,
      navigate,
      refreshKey,
      triggerRefresh: () => setRefreshKey((k) => k + 1),
      settings,
      setSettings,
      handleError,
      logout,
      liveTotal,
      pendingOrders,
      reportLive: setLiveTotal
    }),
    [admin, page, navigate, refreshKey, settings, handleError, logout, liveTotal, pendingOrders]
  );

  const PageComp = canSee(navItem(page), admin) ? PAGES[page] : PAGES.dashboard;

  return (
    <AdminContext.Provider value={ctx}>
      <Sidebar
        page={page}
        onNavigate={navigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        admin={admin}
        liveTotal={liveTotal}
        pendingOrders={pendingOrders}
        simulate={!!settings?.simulateVisitors}
      />
      <div className="lg:pl-[264px] min-h-screen flex flex-col print:pl-0">
        <Topbar
          page={page}
          admin={admin}
          liveTotal={liveTotal}
          onMenu={() => setSidebarOpen(true)}
          onRefresh={ctx.triggerRefresh}
          onNavigate={navigate}
          onLogout={logout}
          onChangePassword={() => setPwOpen(true)}
        />
        <main className="admin-main flex-1 w-full max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div key={page} className="animate-[adminPage_.25s_ease-out]">
            <PageComp />
          </div>
        </main>
        <footer className="px-4 sm:px-6 lg:px-8 py-5 text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1 justify-between border-t border-slate-200/70 print:hidden">
          <span>© {new Date().getFullYear()} Hạ Long SmartGuide · Admin Portal</span>
          <span>Múi giờ báo cáo: Asia/Ho_Chi_Minh (UTC+7)</span>
        </footer>
      </div>
      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Đổi mật khẩu" subtitle="Mật khẩu mới có hiệu lực ngay lập tức" icon="fa-key" size="sm">
        <ChangePasswordForm compact onDone={() => setPwOpen(false)} />
      </Modal>
    </AdminContext.Provider>
  );
};

export default AdminApp;
