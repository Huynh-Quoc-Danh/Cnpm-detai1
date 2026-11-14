/** UI + narration languages. Order everywhere: vi, en, ko, ja, zh. Vietnamese is the default. */
export type LanguageCode = 'vi' | 'en' | 'ko' | 'ja' | 'zh';

/** Languages stored in `translations` (vi/en use the flat *Vi / *En fields). */
export type ExtraLanguageCode = 'ko' | 'ja' | 'zh';

export type CategoryKey = 'All' | 'Iconic' | 'Unique Rock' | 'Island' | 'Natural';

export type ActiveTab = 'explore' | 'map' | 'favorites' | 'settings';

export type ViewMode = 'desktop' | 'mobile';

/** A value per UI language (vi/en only – packages, legacy data). */
export interface LangPair<T = string> {
  vi: T;
  en: T;
}

/**
 * A value per language: vi/en always present, ko/ja/zh optional. The API fills every key
 * ('' / 0 / null when missing) – treat empty as missing; fallback order lang -> en -> vi.
 */
export type LocalizedText<T = string> = LangPair<T> & Partial<Record<ExtraLanguageCode, T>>;

/** Translated site texts for ko / ja / zh (`HeritageSite.translations`). */
export interface SiteTranslation {
  name: string;
  province: string;
  year: string;
  category: string;
  shortDesc: string;
  history: string;
  geology: string;
  highlights: string[];
}

/** Translated exhibit texts for ko / ja / zh (`Exhibit.translations`). */
export interface ExhibitTranslation {
  name: string;
  zone: string;
  shortDesc: string;
}

/** Sub-item of a site ("Điểm nhấn"), e.g. a rock face, a cave chamber, a viewpoint. */
export interface Exhibit {
  id: string; // "s{siteId}-e{n}"
  siteId: number;
  nameVi: string;
  nameEn: string;
  zoneVi: string;
  zoneEn: string;
  image: string;
  shortDescVi: string;
  shortDescEn: string;
  /** Full 45–90 s script. Empty strings in public API responses (fetch via getNarration). */
  narration: LocalizedText;
  durationSec: LocalizedText<number>;
  audioUrl: LocalizedText<string | null>;
  translations?: Partial<Record<ExtraLanguageCode, ExhibitTranslation>>;
  lat?: number;
  lng?: number;
  sortOrder: number;
}

/** Heritage site (same shape as server/seed/sites/{id}.json and the API). */
export interface HeritageSite {
  id: number;
  slug: string;
  name: string;
  nameVi: string;
  provinceEn: string;
  provinceVi: string;
  yearEn: string;
  yearVi: string;
  categoryEn: string;
  categoryVi: string;
  categoryKey: Exclude<CategoryKey, 'All'>;
  image: string;
  fallbackImage: string;
  lat: number;
  lng: number;
  rangeMeters: number;
  rating: number;
  reviewsCount: number;
  shortDescVi: string;
  shortDescEn: string;
  historyVi: string;
  historyEn: string;
  geologyVi: string;
  geologyEn: string;
  highlightsVi: string[];
  highlightsEn: string[];
  /** Full 3–4 minute script. Empty strings in public API responses (never sent to unpaid clients). */
  narration: LocalizedText;
  /** Estimated spoken length (seconds) of the FULL narration at rate 1.0. */
  durationSec: LocalizedText<number>;
  /** Optional uploaded mp3 per language; otherwise TTS is used. */
  audioUrl: LocalizedText<string | null>;
  /** ko / ja / zh texts (missing fields fall back to en, then vi – use the src/i18n helpers). */
  translations?: Partial<Record<ExtraLanguageCode, SiteTranslation>>;
  coordSource?: string;
  isActive?: boolean;
  exhibits: Exhibit[];
}

/** Old mock-data shape (src/data/mockData.ts), kept for the offline fallback mapper. */
export interface LegacyHeritageSite {
  id: number;
  name: string;
  nameVi: string;
  provinceEn: string;
  provinceVi: string;
  yearEn: string;
  yearVi: string;
  categoryEn: string;
  categoryVi: string;
  categoryKey: Exclude<CategoryKey, 'All'>;
  durationEn: string;
  durationVi: string;
  image: string;
  fallbackImage: string;
  lat: number;
  lng: number;
  rangeMeters: number;
  rating: number;
  reviewsCount: number;
  shortDescVi: string;
  shortDescEn: string;
  historyVi: string;
  historyEn: string;
  geologyVi: string;
  geologyEn: string;
  highlightsVi: string[];
  highlightsEn: string[];
  audioText: LangPair;
}

// ---------------- Commerce ----------------
export type TicketScope = 'site' | 'all';
export type PaymentMethod = 'vietqr' | 'momo' | 'card';
export type OrderStatus = 'pending' | 'paid' | 'expired' | 'refunded' | 'cancelled';

export interface TicketPackage {
  id: number;
  code: string;
  nameVi: string;
  nameEn: string;
  descVi: string;
  descEn: string;
  price: number; // VND
  scope: TicketScope;
  durationHours: number;
  maxPeople?: number;
  isActive: boolean;
  badgeVi?: string | null;
  badgeEn?: string | null;
  sortOrder?: number;
}

export interface Ticket {
  token: string;
  orderId: string | null;
  code: string | null;
  scope: TicketScope;
  siteIds: number[];
  issuedAt: string;
  expiresAt: string;
  packageName: string;
}

export interface Order {
  id: string; // "HL" + 8 chars
  packageId: number;
  packageName: string;
  siteId: number | null;
  amount: number;
  method: PaymentMethod;
  status: OrderStatus;
  visitorId?: string | null;
  lang?: LanguageCode | null;
  customerName?: string | null;
  customerPhone?: string | null;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string;
  transferNote: string;
  checkoutUrl: string; // "/pay/<id>"
  ticket?: Ticket;
  /** Admin listings only: generated demo history. */
  demo?: boolean;
}

export interface CreateOrderInput {
  packageId: number;
  siteId?: number | null;
  visitorId?: string;
  lang: LanguageCode;
  method: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
}

export interface BankInfo {
  bankId: string;
  accountNo: string;
  accountName: string;
}

export interface PublicConfig {
  appName: string;
  previewSeconds: number;
  publicBaseUrl: string | null;
  bank: BankInfo;
  currency: 'VND';
}

export interface NetworkInfo {
  lanUrls: string[];
}

export interface NarrationPayload {
  locked: boolean;
  /** Full text if entitled, else the preview (~previewSec of speech). */
  text: string;
  /** FULL duration in seconds (always). */
  durationSec: number;
  previewSec: number;
  audioUrl: string | null;
  /** Language of `text` (may differ from the requested one after fallback ko/ja/zh -> en -> vi). */
  lang?: LanguageCode;
  requestedLang?: LanguageCode;
}

export interface RedeemResult {
  ok: boolean;
  ticket?: Ticket;
  message: string;
}

export interface VerifyResult {
  valid: boolean;
  ticket?: Ticket;
}

export type VisitorSource = 'gps' | 'qr' | 'view' | 'sim';
export type DeviceType = 'mobile' | 'desktop';

export interface HeartbeatInput {
  visitorId: string;
  siteId: number | null;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  source: VisitorSource;
  lang: LanguageCode;
  device: DeviceType;
  userAgent?: string;
}

export interface HeartbeatResult {
  ok: boolean;
  siteId?: number | null;
  activeAtSite?: number;
}

// ---------------- Admin ----------------
export interface AdminUser {
  id: number;
  username: string;
  displayName: string;
  role: string;
  lastLoginAt?: string | null;
}

export interface AdminLoginResult {
  token: string;
  admin: AdminUser;
  expiresAt: string;
}

export interface PeriodNumbers {
  today: number;
  week: number;
  month: number;
}

export interface LiveSiteCount {
  siteId: number;
  nameVi: string;
  count: number;
  real?: number;
  simulated?: number;
}

export interface TopSiteStat {
  siteId: number;
  nameVi: string;
  listens: number;
  tickets: number;
  revenue?: number;
}

export interface StatsOverview {
  generatedAt: string;
  timezone: string;
  liveTotal: number;
  liveReal: number;
  liveSimulated: number;
  livePerSite: LiveSiteCount[];
  tickets: PeriodNumbers & { total: number };
  revenue: PeriodNumbers & { total: number };
  listens: PeriodNumbers;
  /** % of distinct listeners (30 days) who bought a ticket. */
  conversionRate: number;
  trend: {
    tickets: PeriodNumbers; // % change vs previous period
    revenue: PeriodNumbers;
    previous: { tickets: PeriodNumbers; revenue: PeriodNumbers };
  };
  topSites: TopSiteStat[];
  recentOrders: Order[];
  includesDemoData: boolean;
}

export type SalesRange = 'day' | 'week' | 'month';

export interface SalesBucket {
  key: string;
  label: string;
  tickets: number;
  revenue: number;
  listens: number;
}

export interface SalesStats {
  range: SalesRange;
  from: string;
  to: string;
  timezone: string;
  buckets: SalesBucket[];
  totals: { tickets: number; revenue: number; listens: number };
  byPackage: Array<{ packageId: number; name: string; tickets: number; revenue: number }>;
  byMethod: Array<{ method: PaymentMethod; tickets: number; revenue: number }>;
}

export interface LiveVisitor {
  visitorId: string;
  siteId: number | null;
  siteName: string | null;
  lat: number | null;
  lng: number | null;
  source: VisitorSource;
  device: DeviceType;
  lang: LanguageCode;
  lastSeen: string;
  firstSeen: string;
  simulated: boolean;
}

export interface LiveSnapshot {
  visitors: LiveVisitor[];
  perSite: Array<LiveSiteCount & { name: string; lat: number; lng: number }>;
  liveTotal: number;
  liveReal: number;
  liveSimulated: number;
  windowSec: number;
  simulateVisitors: boolean;
}

export interface OrderQuery {
  status?: OrderStatus | '';
  from?: string; // YYYY-MM-DD (VN local)
  to?: string; // YYYY-MM-DD inclusive
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface OrderPage {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ClaimCode {
  code: string;
  scope: TicketScope;
  siteIds: number[];
  durationHours: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  note: string;
  createdAt?: string;
}

export interface AdminSettings {
  publicBaseUrl: string | null;
  previewSeconds: number;
  bank: BankInfo;
  simulateVisitors: boolean;
}

export interface UploadResult {
  url: string;
  size?: number;
}

// ---------------- Existing app types ----------------
export interface RecommendedRoute {
  id: string;
  nameVi: string;
  nameEn: string;
  poiIds: number[];
  durationHours: number;
}

export interface AiKnowledgeItem {
  keywords: string[];
  answerVi: string;
  answerEn: string;
  answerKo?: string;
  answerJa?: string;
  answerZh?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
}

// Kiến trúc 3 lớp (3-Layer Architecture) & Microservices Logs
export interface ThreeLayerLog {
  id: string;
  timestamp: string;
  action: string;
  controllerLayer: string;
  businessLayer: string;
  dataAccessLayer: string;
  status: '200 OK' | '201 CREATED' | '403 PAYWALL';
  latencyMs: number;
}

export interface MicroserviceEvent {
  id: string;
  timestamp: string;
  sourceService: 'API-Gateway' | 'Geo-Service' | 'TTS-Audio-Service' | 'Ticketing-Service' | 'AI-RAG-Service';
  targetService: 'API-Gateway' | 'Geo-Service' | 'TTS-Audio-Service' | 'Ticketing-Service' | 'AI-RAG-Service';
  protocol: 'REST/HTTP' | 'gRPC' | 'RabbitMQ Event';
  eventName: string;
  payloadSummary: string;
}
