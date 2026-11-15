import React, { createContext, useContext } from 'react';
import type { AdminSettings, AdminUser } from '../types';
import type { AdminPage } from './routes';

export interface AdminContextValue {
  admin: AdminUser;
  page: AdminPage;
  navigate: (page: AdminPage) => void;
  /** Tăng mỗi khi bấm nút "Làm mới" trên topbar – các trang dùng làm dependency để tải lại. */
  refreshKey: number;
  triggerRefresh: () => void;
  settings: AdminSettings | null;
  setSettings: (s: AdminSettings) => void;
  /** Xử lý lỗi chung: 401 -> về trang đăng nhập; còn lại hiện toast. */
  handleError: (err: unknown, fallback?: string) => void;
  logout: () => void;
  liveTotal: number | null;
  pendingOrders: number | null;
  /** Cập nhật số khách trực tuyến cho topbar (trang Dashboard/Live gọi khi có số mới). */
  reportLive: (n: number) => void;
}

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminApp');
  return ctx;
}
