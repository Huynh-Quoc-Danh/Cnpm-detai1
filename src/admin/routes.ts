// Điều hướng nội bộ trang quản trị: /admin/<page> + history.pushState (không dùng react-router).
export type AdminPage = 'dashboard' | 'live' | 'reports' | 'sites' | 'qr' | 'orders' | 'packages' | 'codes' | 'tenants' | 'settings';

export interface NavItem {
  key: AdminPage;
  label: string;
  icon: string;
  desc: string;
  /** Chỉ quản trị nền tảng (không thuộc ban quản lý nào) mới thấy trang này. */
  superOnly?: boolean;
}

/** Quản trị nền tảng: tài khoản không gắn với ban quản lý (tenant) nào. */
export const isSuperAdmin = (admin: { tenantId?: number | null }) => admin.tenantId == null;

export const canSee = (item: NavItem, admin: { tenantId?: number | null }) => !item.superOnly || isSuperAdmin(admin);

export const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Phân tích',
    items: [
      { key: 'dashboard', label: 'Tổng quan', icon: 'fa-chart-pie', desc: 'Số liệu kinh doanh & khách tham quan' },
      { key: 'live', label: 'Giám sát trực tiếp', icon: 'fa-satellite-dish', desc: 'Khách đang có mặt tại từng điểm' },
      { key: 'reports', label: 'Báo cáo', icon: 'fa-chart-column', desc: 'Doanh thu, vé và lượt nghe theo thời gian' }
    ]
  },
  {
    title: 'Nội dung',
    items: [
      { key: 'sites', label: 'Địa điểm', icon: 'fa-map-location-dot', desc: 'Điểm tham quan, toạ độ GPS, thuyết minh' },
      { key: 'qr', label: 'Mã QR', icon: 'fa-qrcode', desc: 'QR mở ứng dụng & QR tại từng điểm' }
    ]
  },
  {
    title: 'Kinh doanh',
    items: [
      { key: 'orders', label: 'Đơn hàng & Vé', icon: 'fa-receipt', desc: 'Đơn mua vé, thanh toán, hoàn tiền' },
      { key: 'packages', label: 'Gói vé', icon: 'fa-ticket', desc: 'Bảng giá và quyền nghe' },
      { key: 'codes', label: 'Mã kích hoạt', icon: 'fa-key', desc: 'Mã tặng / mã sự kiện mở khoá thuyết minh' }
    ]
  },
  {
    title: 'Hệ thống',
    items: [
      { key: 'tenants', label: 'Ban quản lý', icon: 'fa-building-user', desc: 'Các ban quản lý, địa điểm và tài khoản của từng ban', superOnly: true },
      { key: 'settings', label: 'Cài đặt', icon: 'fa-gear', desc: 'Địa chỉ công khai, thanh toán, mô phỏng', superOnly: true }
    ]
  }
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export const PAGE_KEYS = NAV_ITEMS.map((i) => i.key);

export function pageFromPath(pathname = window.location.pathname): AdminPage {
  const seg = pathname.replace(/\/+$/, '').split('/')[2] || 'dashboard';
  return (PAGE_KEYS as string[]).includes(seg) ? (seg as AdminPage) : 'dashboard';
}

export function pathForPage(page: AdminPage): string {
  return page === 'dashboard' ? '/admin' : `/admin/${page}`;
}

export const navItem = (page: AdminPage) => NAV_ITEMS.find((i) => i.key === page)!;
