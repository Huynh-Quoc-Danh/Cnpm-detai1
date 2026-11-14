// HTTP client for the Hạ Long SmartGuide backend (see server/API.md).
import type {
  AdminLoginResult,
  AdminSettings,
  AdminUser,
  ClaimCode,
  CreateOrderInput,
  Exhibit,
  HeartbeatInput,
  HeartbeatResult,
  HeritageSite,
  LanguageCode,
  LiveSnapshot,
  NarrationPayload,
  NetworkInfo,
  Order,
  OrderPage,
  OrderQuery,
  OrderStatus,
  PaymentMethod,
  PublicConfig,
  RedeemResult,
  SalesRange,
  SalesStats,
  StatsOverview,
  TicketPackage,
  UploadResult,
  VerifyResult
} from '../types';
import { getVisitorId } from './visitor';

export const API_BASE = '/api';
export const ADMIN_TOKEN_KEY = 'hl_admin_token';

export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  query?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
  /** Return the raw Response (e.g. for CSV). */
  raw?: boolean;
  /** Do not throw on these status codes; return the parsed body instead. */
  allowStatus?: number[];
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  let url = API_BASE + path;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    const s = qs.toString();
    if (s) url += (url.includes('?') ? '&' : '?') + s;
  }
  return url;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  try {
    headers['X-Visitor-Id'] = getVisitorId();
  } catch {
    /* ignore */
  }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
      cache: 'no-store'
    });
  } catch (err: any) {
    if (err && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.');
  }
  if (opts.raw && res.ok) return res as unknown as T;
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok && !(opts.allowStatus || []).includes(res.status)) {
    const message =
      (data && typeof data === 'object' && (data.error || data.message)) ||
      (res.status === 401 ? 'Phiên đăng nhập đã hết hạn' : `Lỗi máy chủ (${res.status})`);
    if (res.status === 401 && opts.token && path.startsWith('/admin')) {
      try {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
      } catch {
        /* ignore */
      }
    }
    throw new ApiError(res.status, String(message), data);
  }
  return data as T;
}

// ---------------- Public API ----------------
export const api = {
  getConfig: () => request<PublicConfig>('/config'),
  getNetwork: () => request<NetworkInfo>('/network'),
  getSites: () => request<HeritageSite[]>('/sites'),
  getSite: (id: number) => request<HeritageSite>(`/sites/${id}`),
  getNarration: (
    siteId: number,
    lang: LanguageCode,
    opts: { exhibitId?: string; token?: string | null; signal?: AbortSignal } = {}
  ) =>
    request<NarrationPayload>(`/sites/${siteId}/narration`, {
      query: { lang, exhibitId: opts.exhibitId },
      token: opts.token,
      signal: opts.signal
    }),
  getPackages: () => request<TicketPackage[]>('/packages'),
  createOrder: (input: CreateOrderInput) =>
    request<Order>('/orders', { method: 'POST', body: { visitorId: getVisitorId(), ...input } }),
  getOrder: (id: string) => request<Order>(`/orders/${encodeURIComponent(id)}`),
  payOrder: (id: string, method?: PaymentMethod) =>
    request<Order>(`/orders/${encodeURIComponent(id)}/pay`, { method: 'POST', body: { method } }),
  /** Resolves with {ok:false, message} for invalid codes (does not throw on 400). */
  redeemCode: (code: string) =>
    request<RedeemResult>('/tickets/redeem', {
      method: 'POST',
      body: { code, visitorId: getVisitorId() },
      allowStatus: [400]
    }),
  verifyTicket: (token: string) => request<VerifyResult>('/tickets/verify', { token }),
  heartbeat: (input: Omit<HeartbeatInput, 'visitorId'> & { visitorId?: string }) =>
    request<HeartbeatResult>('/visitors/heartbeat', {
      method: 'POST',
      body: { visitorId: getVisitorId(), ...input }
    })
};

// ---------------- Admin API ----------------
export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

const admin = <T>(path: string, opts: Omit<RequestOptions, 'token'> = {}) =>
  request<T>('/admin' + path, { ...opts, token: getAdminToken() });

export type SiteInput = Partial<HeritageSite>;
export type ExhibitInput = Partial<Exhibit>;
export type PackageInput = Partial<TicketPackage>;
export type ClaimCodeInput = Partial<ClaimCode>;

export const adminApi = {
  // auth
  /** Stores the token in localStorage 'hl_admin_token' on success. */
  login: async (username: string, password: string) => {
    const r = await request<AdminLoginResult>('/admin/login', { method: 'POST', body: { username, password } });
    setAdminToken(r.token);
    return r;
  },
  /** Always clears the stored token. */
  logout: async () => {
    try {
      await admin<{ ok: boolean }>('/logout', { method: 'POST', body: {} });
    } catch {
      /* ignore */
    }
    setAdminToken(null);
  },
  me: () => admin<{ admin: AdminUser }>('/me'),
  changePassword: (oldPassword: string, newPassword: string) =>
    admin<{ ok: boolean }>('/password', { method: 'POST', body: { oldPassword, newPassword } }),
  isLoggedIn: () => !!getAdminToken(),

  // stats
  getOverview: () => admin<StatsOverview>('/stats/overview'),
  getSales: (range: SalesRange) => admin<SalesStats>('/stats/sales', { query: { range } }),
  getLive: () => admin<LiveSnapshot>('/live'),

  // sites & exhibits (full objects incl. narration)
  listSites: () => admin<HeritageSite[]>('/sites'),
  getSite: (id: number) => admin<HeritageSite>(`/sites/${id}`),
  createSite: (input: SiteInput) => admin<HeritageSite>('/sites', { method: 'POST', body: input }),
  updateSite: (id: number, input: SiteInput) => admin<HeritageSite>(`/sites/${id}`, { method: 'PUT', body: input }),
  deleteSite: (id: number) => admin<{ ok: boolean }>(`/sites/${id}`, { method: 'DELETE' }),
  createExhibit: (siteId: number, input: ExhibitInput) =>
    admin<Exhibit>(`/sites/${siteId}/exhibits`, { method: 'POST', body: input }),
  updateExhibit: (id: string, input: ExhibitInput) =>
    admin<Exhibit>(`/exhibits/${encodeURIComponent(id)}`, { method: 'PUT', body: input }),
  deleteExhibit: (id: string) => admin<{ ok: boolean }>(`/exhibits/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // packages
  listPackages: () => admin<TicketPackage[]>('/packages'),
  createPackage: (input: PackageInput) => admin<TicketPackage>('/packages', { method: 'POST', body: input }),
  updatePackage: (id: number, input: PackageInput) =>
    admin<TicketPackage>(`/packages/${id}`, { method: 'PUT', body: input }),
  deletePackage: (id: number) => admin<{ ok: boolean }>(`/packages/${id}`, { method: 'DELETE' }),

  // orders
  listOrders: (q: OrderQuery = {}) => admin<OrderPage>('/orders', { query: q as RequestOptions['query'] }),
  updateOrderStatus: (id: string, status: Extract<OrderStatus, 'paid' | 'refunded' | 'cancelled'>) =>
    admin<Order>(`/orders/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } }),
  /** Fetches the CSV (with auth header) as a Blob. */
  exportOrdersCsv: async (q: OrderQuery = {}): Promise<Blob> => {
    const res = await admin<Response>('/orders.csv', { query: q as RequestOptions['query'], raw: true });
    return res.blob();
  },

  // claim codes
  listCodes: () => admin<ClaimCode[]>('/codes'),
  createCode: (input: ClaimCodeInput) => admin<ClaimCode>('/codes', { method: 'POST', body: input }),
  updateCode: (code: string, input: ClaimCodeInput) =>
    admin<ClaimCode>(`/codes/${encodeURIComponent(code)}`, { method: 'PUT', body: input }),
  deleteCode: (code: string) => admin<{ ok: boolean }>(`/codes/${encodeURIComponent(code)}`, { method: 'DELETE' }),

  // settings & uploads
  getSettings: () => admin<AdminSettings>('/settings'),
  updateSettings: (patch: Partial<AdminSettings>) => admin<AdminSettings>('/settings', { method: 'PUT', body: patch }),
  upload: (filename: string, dataBase64: string, kind: 'image' | 'audio') =>
    admin<UploadResult>('/upload', { method: 'POST', body: { filename, dataBase64, kind } }),
  /** Reads a File and uploads it. */
  uploadFile: async (file: File, kind: 'image' | 'audio') => {
    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).replace(/^data:[^;]*;base64,/, ''));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
    return adminApi.upload(file.name, dataBase64, kind);
  }
};

/** Format VND: 99000 -> "99.000 ₫". */
export function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount || 0)) + ' ₫';
}
