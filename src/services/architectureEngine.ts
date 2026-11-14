import { HeritageSite, ThreeLayerLog, MicroserviceEvent, LanguageCode, TicketPackage } from '../types';
import { aiKnowledgeBase } from '../data/mockData';
import { offlineSites } from '../data/offlineSites';
import { narrationDuration, siteName, siteText, tr, trf } from '../i18n';

// Catalog shared with the UI: starts with the offline data and is replaced by the live
// /api/sites list (and /api/packages) once loaded, so logs and chatbot answers match the server.
let siteCatalog: HeritageSite[] = offlineSites;
let packageCatalog: TicketPackage[] = [];

export function setSiteCatalog(sites: HeritageSite[]): void {
  if (Array.isArray(sites) && sites.length) siteCatalog = sites;
}

export function setPackageCatalog(pkgs: TicketPackage[]): void {
  if (Array.isArray(pkgs)) packageCatalog = pkgs.filter((p) => p.isActive !== false);
}

const vnd = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + ' ₫';

const TICKET_KEYWORDS = [
  'vé', 'ticket', 'price', 'giá', 'mua', 'buy', 'thanh toán', 'payment', 'pay', 'qr',
  'mã', 'code', 'mở khóa', 'unlock', 'nghe thử', 'preview', 'payoo',
  // 한국어
  '티켓', '입장권', '이용권', '패스', '가격', '요금', '얼마', '구매', '결제', '코드', '미리 듣기',
  // 日本語
  'チケット', 'パス', '料金', '値段', 'いくら', '購入', '支払', '決済', 'コード', '試聴',
  // 中文
  '门票', '票价', '通票', '通行证', '价格', '多少钱', '购买', '支付', '付款', '二维码', '激活码', '兑换码', '票码', '试听'
];

type PkgLite = Pick<TicketPackage, 'nameVi' | 'nameEn' | 'price' | 'durationHours'> & { code?: string };

/** ko/ja/zh names of the seeded packages (packages only carry vi/en names). */
const PKG_NAMES: Record<string, { ko: string; ja: string; zh: string }> = {
  SITE_SINGLE: { ko: '1개 명소 이용권', ja: '1スポット券', zh: '单景点通票' },
  ALL_DAY: { ko: '1일 이용권 – 베이 전체', ja: '1日券 – 湾内全スポット', zh: '一日通票 – 全湾景点' },
  FAMILY: { ko: '가족 패키지 (최대 4명)', ja: 'ファミリーパック（最大4名）', zh: '家庭套票（最多4人）' }
};

/** Localized package name (ko/ja/zh from PKG_NAMES for the seeded codes, else en -> vi). */
export function pkgName(p: PkgLite, lang: LanguageCode): string {
  if (lang === 'vi') return p.nameVi;
  if (lang === 'en') return p.nameEn || p.nameVi;
  return (p.code && PKG_NAMES[p.code]?.[lang]) || p.nameEn || p.nameVi;
}

/** ko/ja/zh versions of the seeded package badges, keyed by the English badge text. */
const PKG_BADGES: Record<string, { ko: string; ja: string; zh: string }> = {
  'Most popular': { ko: '가장 인기', ja: '一番人気', zh: '最受欢迎' },
  'Best value': { ko: '최고 가성비', ja: 'お得', zh: '最划算' }
};

/** Localized package badge ('' when the package has none). */
export function pkgBadge(p: Pick<TicketPackage, 'badgeVi' | 'badgeEn'>, lang: LanguageCode): string {
  const vi = p.badgeVi || '';
  const en = p.badgeEn || '';
  if (lang === 'vi') return vi || en;
  if (lang === 'en') return en || vi;
  return (en && PKG_BADGES[en.trim()]?.[lang]) || en || vi;
}

function ticketAnswer(lang: LanguageCode): string {
  const pkgs: PkgLite[] = packageCatalog.length
    ? packageCatalog
    : [
        { code: 'SITE_SINGLE', nameVi: 'Vé 1 điểm', nameEn: 'Single-site pass', price: 29000, durationHours: 24 },
        { code: 'ALL_DAY', nameVi: 'Vé cả ngày – tất cả điểm', nameEn: 'All-day pass – all sites', price: 99000, durationHours: 24 },
        { code: 'FAMILY', nameVi: 'Vé gia đình (4 người)', nameEn: 'Family pass (4 people)', price: 199000, durationHours: 48 }
      ];
  const hours = (h: number) => trf(lang, { vi: '{h} giờ', en: '{h}h', ko: '{h}시간', ja: '{h}時間', zh: '{h}小时' }, { h });
  const list = pkgs.map((p) => `• ${pkgName(p, lang)}: ${vnd(p.price)} (${hours(p.durationHours)})`).join('\n');
  const intro = tr(lang, {
    vi: 'Mỗi điểm tham quan có một mã QR riêng. Quét mã để nghe thử miễn phí khoảng 30 giây; muốn nghe trọn bản thuyết minh 3–4 phút, bạn mua vé điện tử ngay trong ứng dụng:',
    en: 'Every site has its own QR code. Scan it for a free ~30-second preview; to unlock the full 3–4 minute narration, buy an e-ticket in the app:',
    ko: '각 명소마다 전용 QR 코드가 있습니다. QR 코드를 스캔하면 약 30초 동안 무료로 미리 들을 수 있고, 3~4분 분량의 전체 해설을 들으려면 앱에서 전자 이용권을 구매하시면 됩니다:',
    ja: '各スポットには専用のQRコードがあります。読み取ると約30秒の無料試聴ができ、3〜4分の解説をすべて聴くにはアプリで電子チケットを購入してください：',
    zh: '每个景点都有专属二维码。扫码即可免费试听约 30 秒；如需收听完整的 3–4 分钟讲解，请在应用内购买电子票：'
  });
  const outro = tr(lang, {
    vi: 'Thanh toán bằng VietQR (chuyển khoản ngân hàng), ví điện tử hoặc thẻ. Nếu nhân viên đưa mã kích hoạt, chọn "Đã có mã vé?" để nhập mã. (Vé tham quan vịnh do Ban quản lý bán riêng tại bến tàu.)',
    en: 'Pay by VietQR (bank transfer), e-wallet or card. If staff gave you an activation code, choose "Already have a code?". (Bay entrance tickets are sold separately at the harbour.)',
    ko: 'VietQR(계좌 이체), 전자지갑 또는 카드로 결제할 수 있습니다. 직원에게 활성화 코드를 받으셨다면 "코드가 있으신가요?"를 눌러 입력하세요. (하롱베이 입장권은 선착장에서 별도로 판매합니다.)',
    ja: 'お支払いはVietQR（銀行振込）、電子ウォレット、カードに対応しています。スタッフから有効化コードを受け取った場合は「コードをお持ちですか？」から入力してください。（ハロン湾の入場券は船着き場で別途販売しています。）',
    zh: '可使用 VietQR（银行转账）、电子钱包或银行卡付款。如果工作人员给了您激活码，请选择“已有激活码？”输入。（下龙湾景区门票需在码头另行购买。）'
  });
  return [intro, list, outro].join('\n');
}

/** Answer of a knowledge item in `lang` (missing ko/ja/zh -> en). */
function kbAnswer(item: (typeof aiKnowledgeBase)[number], lang: LanguageCode): string {
  return tr(lang, { vi: item.answerVi, en: item.answerEn, ko: item.answerKo, ja: item.answerJa, zh: item.answerZh });
}

// ============================================================================
// LỚP 3: DATA ACCESS LAYER (DAL / REPOSITORY)
// Chịu trách nhiệm truy xuất dữ liệu từ Database / LocalStorage Persistence
// ============================================================================
class HeritageRepositoryDAL {
  findAllSites(): HeritageSite[] {
    return siteCatalog;
  }

  findSiteById(id: number): HeritageSite | undefined {
    return siteCatalog.find((site) => site.id === id);
  }

  getSavedFavorites(): number[] {
    const raw = localStorage.getItem('fav_sites');
    return raw ? JSON.parse(raw) : [1, 2];
  }

  saveFavorites(ids: number[]): void {
    localStorage.setItem('fav_sites', JSON.stringify(ids));
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  saveAccessToken(token: string | null): void {
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }
}

// ============================================================================
// LỚP 2: BUSINESS LOGIC LAYER (BLL / SERVICE)
// Xử lý nghiệp vụ: Tính khoảng cách Haversine GPS, kiểm tra vé, lọc POI, AI RAG
// ============================================================================
class HeritageServiceBLL {
  private dal = new HeritageRepositoryDAL();

  filterPois(query: string, category: string): HeritageSite[] {
    const q = query.toLowerCase().trim();
    return this.dal.findAllSites().filter((site) => {
      const matchQuery =
        site.name.toLowerCase().includes(q) ||
        site.nameVi.toLowerCase().includes(q) ||
        site.shortDescVi.toLowerCase().includes(q) ||
        site.shortDescEn.toLowerCase().includes(q);
      const matchCat = category === 'All' || site.categoryKey === category;
      return matchQuery && matchCat;
    });
  }

  // Công thức Haversine tính khoảng cách thực tế (mét) giữa thuyền và đảo
  calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  checkGeofenceProximity(lat: number, lng: number): { site: HeritageSite; distance: number } | null {
    const allSites = this.dal.findAllSites();
    for (const site of allSites) {
      const dist = this.calculateDistanceMeters(lat, lng, site.lat, site.lng);
      if (dist <= site.rangeMeters) {
        return { site, distance: dist };
      }
    }
    return null;
  }

  validateClaimCode(code: string): { valid: boolean; token: string | null } {
    const clean = code.trim().toUpperCase();
    if (clean.length >= 4) {
      const token = `JWT_CLAIM_${clean}_${Date.now().toString().slice(-5)}`;
      this.dal.saveAccessToken(token);
      return { valid: true, token };
    }
    return { valid: false, token: null };
  }

  processPayooPayment(): string {
    const token = `JWT_PAYOO_VIP_${Date.now().toString().slice(-5)}`;
    this.dal.saveAccessToken(token);
    return token;
  }

  queryAiAssistant(question: string, lang: LanguageCode): string {
    const lower = question.toLowerCase();
    if (TICKET_KEYWORDS.some((kw) => lower.includes(kw))) return ticketAnswer(lang);
    for (const item of aiKnowledgeBase) {
      if (item.keywords.some((kw) => lower.includes(kw.toLowerCase()))) return kbAnswer(item, lang);
    }
    const site = this.dal.findAllSites().find((x) =>
      [x.nameVi, x.name, ...Object.values(x.translations || {}).map((t) => t?.name)]
        .filter((n): n is string => !!n && n.trim().length > 1)
        .some((n) => lower.includes(n.toLowerCase()))
    );
    if (site) {
      const mins = Math.max(1, Math.round(narrationDuration(site, lang) / 60));
      const desc = siteText(site, lang, 'shortDesc');
      return trf(
        lang,
        {
          vi: '{name}: {desc} Bản thuyết minh đầy đủ dài khoảng {mins} phút – mở mục Khám phá hoặc quét mã QR tại điểm để nghe.',
          en: '{name}: {desc} The full narration lasts about {mins} minutes – open Explore or scan the site QR code to listen.',
          ko: '{name}: {desc} 전체 해설은 약 {mins}분 분량입니다. 탐색 탭을 열거나 현장의 QR 코드를 스캔해 들어 보세요.',
          ja: '{name}：{desc} 解説全体は約{mins}分です。「探索」を開くか、現地のQRコードを読み取ってお聴きください。',
          zh: '{name}：{desc} 完整讲解约 {mins} 分钟——打开“探索”或扫描景点二维码即可收听。'
        },
        { name: siteName(site, lang), desc, mins }
      );
    }
    return tr(lang, {
      vi: 'Tôi có thể thuyết minh chi tiết về Hòn Trống Mái, Hòn Đỉnh Hương, Đảo Ti Tốp, sự tích vịnh Hạ Long hoặc giá vé nghe thuyết minh!',
      en: 'I can tell you all about Fighting Cocks Islet, Incense Burner Islet, Ti Top Island, the legend of Ha Long Bay or audio pass prices!',
      ko: '싸움닭 바위(혼쫑마이), 향로섬(혼딘흐엉), 띠똡섬, 하롱베이의 전설, 해설 이용권 가격 등에 대해 자세히 안내해 드릴 수 있어요!',
      ja: '闘鶏岩（チョンマイ島）、香炉島（ホン・ディンフーン）、ティートップ島、ハロン湾の伝説、音声ガイドの料金などについて詳しくご案内できます！',
      zh: '我可以为您详细介绍斗鸡石（钟买岛）、香炉岛（鼎香岛）、迪托普岛、下龙湾的传说以及语音讲解价格等信息！'
    });
  }
}

// ============================================================================
// LỚP 1: PRESENTATION / CONTROLLER LAYER + MICROSERVICES EVENT BUS
// Điều phối request từ FE React, ghi nhận log 3 lớp và giao tiếp liên Services
// ============================================================================
class SystemController {
  private bll = new HeritageServiceBLL();
  private dal = new HeritageRepositoryDAL();

  private createTime(): string {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  }

  getFilteredSites(
    query: string,
    category: string,
    onLog?: (log: ThreeLayerLog) => void
  ): HeritageSite[] {
    const result = this.bll.filterPois(query, category);
    if (onLog) {
      onLog({
        id: `LOG_${Date.now()}`,
        timestamp: this.createTime(),
        action: `GET /api/v1/pois?cat=${category}&q=${query || '*'}`,
        controllerLayer: `PoiController.getPois()`,
        businessLayer: `HeritageServiceBLL.filterPois("${query}", "${category}")`,
        dataAccessLayer: `HeritageRepositoryDAL.findAllSites() -> Returned ${result.length} rows`,
        status: '200 OK',
        latencyMs: Math.floor(Math.random() * 14) + 8
      });
    }
    return result;
  }

  triggerAudioNarration(
    siteId: number,
    lang: LanguageCode,
    onLog: (log: ThreeLayerLog, events: MicroserviceEvent[]) => void
  ): HeritageSite | undefined {
    const site = this.dal.findSiteById(siteId);
    if (!site) return undefined;

    const now = this.createTime();
    const log: ThreeLayerLog = {
      id: `LOG_${Date.now()}`,
      timestamp: now,
      action: `POST /api/v1/audio/synthesize (poiId=${siteId}, lang=${lang})`,
      controllerLayer: `AudioController.streamNarration(${siteId})`,
      businessLayer: `AudioServiceBLL.prepareMultilingualScript("${lang}")`,
      dataAccessLayer: `HeritageRepositoryDAL.findSiteById(${siteId})`,
      status: '200 OK',
      latencyMs: 19
    };

    const events: MicroserviceEvent[] = [
      {
        id: `EVT_${Date.now()}_1`,
        timestamp: now,
        sourceService: 'API-Gateway',
        targetService: 'Ticketing-Service',
        protocol: 'gRPC',
        eventName: 'VerifyAccessPass()',
        payloadSummary: `Check token permission for POI #${siteId}`
      },
      {
        id: `EVT_${Date.now()}_2`,
        timestamp: now,
        sourceService: 'API-Gateway',
        targetService: 'TTS-Audio-Service',
        protocol: 'RabbitMQ Event',
        eventName: 'AUDIO_SYNTHESIS_REQUESTED',
        payloadSummary: `Synthesizing ${lang.toUpperCase()} neural voice for "${site.nameVi}"`
      }
    ];

    onLog(log, events);
    return site;
  }

  evaluateGpsPosition(
    lat: number,
    lng: number,
    onLog: (log: ThreeLayerLog, events: MicroserviceEvent[]) => void
  ) {
    const match = this.bll.checkGeofenceProximity(lat, lng);
    const now = this.createTime();

    const log: ThreeLayerLog = {
      id: `LOG_${Date.now()}`,
      timestamp: now,
      action: `POST /api/v1/geo/telemetry (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      controllerLayer: `GeoController.updateBoatTelemetry()`,
      businessLayer: `GeofenceServiceBLL.calculateHaversineDistance()`,
      dataAccessLayer: `SpatialRepositoryDAL.queryNearbyPois()`,
      status: '200 OK',
      latencyMs: 12
    };

    const events: MicroserviceEvent[] = [
      {
        id: `EVT_${Date.now()}_GEO`,
        timestamp: now,
        sourceService: 'API-Gateway',
        targetService: 'Geo-Service',
        protocol: 'REST/HTTP',
        eventName: 'TELEMETRY_PING',
        payloadSummary: `Boat GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`
      }
    ];

    if (match) {
      events.push({
        id: `EVT_${Date.now()}_TRIG`,
        timestamp: now,
        sourceService: 'Geo-Service',
        targetService: 'TTS-Audio-Service',
        protocol: 'RabbitMQ Event',
        eventName: 'GEOFENCE_PROXIMITY_DETECTED',
        payloadSummary: `Within ${match.distance}m of ${match.site.nameVi} (Radius: ${match.site.rangeMeters}m)`
      });
    }

    onLog(log, events);
    return match;
  }

  activatePass(
    method: 'CLAIM_CODE' | 'PAYOO',
    codeInput: string,
    onLog: (log: ThreeLayerLog, events: MicroserviceEvent[]) => void
  ): { success: boolean; token: string | null } {
    const now = this.createTime();
    let token: string | null = null;

    if (method === 'CLAIM_CODE') {
      const res = this.bll.validateClaimCode(codeInput);
      if (!res.valid) return { success: false, token: null };
      token = res.token;
    } else {
      token = this.bll.processPayooPayment();
    }

    const log: ThreeLayerLog = {
      id: `LOG_${Date.now()}`,
      timestamp: now,
      action: `POST /api/v1/auth/activate (${method})`,
      controllerLayer: `AuthController.activateTouristPass()`,
      businessLayer: `TicketServiceBLL.issueJwtToken("${method}")`,
      dataAccessLayer: `TicketRepositoryDAL.saveAccessToken("${token}")`,
      status: '201 CREATED',
      latencyMs: 28
    };

    const events: MicroserviceEvent[] = [
      {
        id: `EVT_${Date.now()}_PAY`,
        timestamp: now,
        sourceService: 'API-Gateway',
        targetService: 'Ticketing-Service',
        protocol: 'REST/HTTP',
        eventName: method === 'PAYOO' ? 'PAYOO_WEBHOOK_CONFIRMED' : 'CLAIM_CODE_VERIFIED',
        payloadSummary: `Issued Token: ${token}`
      }
    ];

    onLog(log, events);
    return { success: true, token };
  }

  askAiBot(
    question: string,
    lang: LanguageCode,
    onLog: (log: ThreeLayerLog, events: MicroserviceEvent[]) => void
  ): string {
    const answer = this.bll.queryAiAssistant(question, lang);
    const now = this.createTime();

    onLog(
      {
        id: `LOG_${Date.now()}`,
        timestamp: now,
        action: `POST /api/v1/ai/chat`,
        controllerLayer: `AiChatController.postQuery()`,
        businessLayer: `RagServiceBLL.semanticMatch("${question.slice(0, 20)}...")`,
        dataAccessLayer: `KnowledgeRepositoryDAL.searchVectors()`,
        status: '200 OK',
        latencyMs: 35
      },
      [
        {
          id: `EVT_${Date.now()}_AI`,
          timestamp: now,
          sourceService: 'API-Gateway',
          targetService: 'AI-RAG-Service',
          protocol: 'gRPC',
          eventName: 'NLP_QUERY_DISPATCH',
          payloadSummary: `Matched knowledge base in ${lang.toUpperCase()}`
        }
      ]
    );

    return answer;
  }
}

export const appController = new SystemController();