// Chuỗi đa ngữ (vi, en, ko, ja, zh) + tiện ích dùng chung cho luồng thanh toán (CheckoutModal, PayPage).
import React from 'react';
import type { BankInfo, LanguageCode, Ticket, TicketPackage } from '../../types';
import { numberLocale, tr, trf } from '../../i18n';

export const BANK_NAMES: Record<string, string> = {
  VCB: 'Vietcombank',
  BIDV: 'BIDV',
  CTG: 'VietinBank',
  ICB: 'VietinBank',
  VBA: 'Agribank',
  TCB: 'Techcombank',
  MB: 'MB Bank',
  MBB: 'MB Bank',
  ACB: 'ACB',
  VPB: 'VPBank',
  TPB: 'TPBank',
  STB: 'Sacombank',
  VIB: 'VIB',
  HDB: 'HDBank',
  SHB: 'SHB',
  OCB: 'OCB',
  MSB: 'MSB'
};

export function bankDisplayName(bankId: string): string {
  return BANK_NAMES[(bankId || '').toUpperCase()] || bankId;
}

export function vietQrImageUrl(bank: BankInfo, amount: number, note: string): string {
  const q = new URLSearchParams({
    amount: String(Math.round(amount)),
    addInfo: note,
    accountName: bank.accountName
  });
  return `https://img.vietqr.io/image/${encodeURIComponent(bank.bankId)}-${encodeURIComponent(
    bank.accountNo
  )}-compact2.png?${q.toString()}`;
}

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function formatDateTime(iso: string | null | undefined, lang: LanguageCode): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(lang === 'en' ? 'en-GB' : numberLocale(lang), {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function durationLabel(hours: number, lang: LanguageCode): string {
  if (hours >= 24 && hours % 24 === 0) {
    const d = hours / 24;
    return trf(
      lang,
      {
        vi: '{h} giờ ({d} ngày)',
        en: d > 1 ? '{h} hours ({d} days)' : '{h} hours ({d} day)',
        ko: '{h}시간 ({d}일)',
        ja: '{h}時間（{d}日）',
        zh: '{h}小时（{d}天）'
      },
      { h: hours, d }
    );
  }
  return trf(
    lang,
    { vi: '{h} giờ', en: hours > 1 ? '{h} hours' : '{h} hour', ko: '{h}시간', ja: '{h}時間', zh: '{h}小时' },
    { h: hours }
  );
}

export function packageIcon(pkg: Pick<TicketPackage, 'code' | 'scope' | 'maxPeople'>): string {
  if ((pkg.maxPeople || 1) > 1 || /FAMILY/i.test(pkg.code)) return 'fa-people-group';
  if (pkg.scope === 'all') return 'fa-ship';
  return 'fa-location-dot';
}

export function ticketScopeLabel(
  ticket: Ticket,
  lang: LanguageCode,
  siteName?: (id: number) => string | undefined
): string {
  if (ticket.scope === 'all')
    return tr(lang, {
      vi: 'Toàn bộ các điểm tham quan',
      en: 'All attractions',
      ko: '모든 관광지',
      ja: 'すべての観光スポット',
      zh: '全部景点'
    });
  return ticket.siteIds.map((id) => (siteName && siteName(id)) || `#${id}`).join(', ');
}

/** Bản dịch tên / nhãn gói vé mặc định (theo mã gói). Chỉ dùng khi admin chưa đổi tên tiếng Anh gốc. */
const PKG_NAMES: Record<string, { en: string; ko: string; ja: string; zh: string }> = {
  SITE_SINGLE: { en: 'Single site pass', ko: '1개 관광지 이용권', ja: '1スポット券', zh: '单景点票' },
  ALL_DAY: { en: 'Day pass – Whole bay', ko: '1일권 – 하롱베이 전체', ja: '1日券 – ハロン湾全域', zh: '一日票 – 全湾通用' },
  FAMILY: { en: 'Family pack', ko: '가족 패키지', ja: 'ファミリーパック', zh: '家庭套票' }
};
const PKG_BADGES: Record<string, { ko: string; ja: string; zh: string }> = {
  'most popular': { ko: '가장 인기', ja: '一番人気', zh: '最受欢迎' },
  'best value': { ko: '최고 가성비', ja: 'お得', zh: '最划算' }
};

/** Tên gói vé theo ngôn ngữ (ko/ja/zh: bản dịch mặc định theo mã gói, nếu không thì tiếng Anh). */
export function packageName(p: Pick<TicketPackage, 'code' | 'nameVi' | 'nameEn'>, lang: LanguageCode): string {
  if (lang === 'vi') return p.nameVi || p.nameEn;
  if (lang === 'en') return p.nameEn || p.nameVi;
  const known = PKG_NAMES[(p.code || '').toUpperCase()];
  if (known && (!p.nameEn || p.nameEn.trim() === known.en)) return known[lang];
  return p.nameEn || p.nameVi;
}

/** Nhãn gói vé ("Phổ biến nhất"...) theo ngôn ngữ. */
export function packageBadge(p: Pick<TicketPackage, 'badgeVi' | 'badgeEn'>, lang: LanguageCode): string | null {
  if (lang === 'vi') return p.badgeVi || null;
  if (lang === 'en') return p.badgeEn || p.badgeVi || null;
  const en = (p.badgeEn || '').trim();
  const known = PKG_BADGES[en.toLowerCase()];
  if (known) return known[lang];
  return en || p.badgeVi || null;
}

/** Tên gói lưu trong vé/đơn (snapshot, thường là tiếng Việt) -> dịch nếu khớp tên gói mặc định. */
export function packageNameFromLabel(label: string | null | undefined, lang: LanguageCode): string {
  const raw = (label || '').trim();
  if (!raw || lang === 'vi') return raw;
  const seed: Record<string, string> = {
    'Vé lẻ 1 điểm': 'SITE_SINGLE',
    'Single site pass': 'SITE_SINGLE',
    'Vé ngày – Toàn vịnh': 'ALL_DAY',
    'Day pass – Whole bay': 'ALL_DAY',
    'Gói gia đình': 'FAMILY',
    'Family pack': 'FAMILY'
  };
  const code = seed[raw];
  if (!code) return raw;
  const known = PKG_NAMES[code];
  return lang === 'en' ? known.en : known[lang];
}

const T_VI = {
  title: 'Mở khóa thuyết minh đầy đủ',
  subtitle: 'Chọn gói vé phù hợp – thanh toán an toàn qua mã QR',
  reasonPreview: 'Bạn đã nghe hết phần nghe thử. Mua vé để nghe trọn bài thuyết minh.',
  reasonQr: 'Chào mừng bạn đến điểm tham quan! Mua vé để nghe trọn bài thuyết minh.',
  reasonManual: 'Nghe thử miễn phí – mua vé để nghe trọn vẹn.',
  previewNote: (s: number) => `Chưa có vé: chỉ nghe thử ${s} giây đầu`,
  included: 'Bao gồm',
  incFull: 'Nghe trọn 3–4 phút thuyết minh',
  incExhibits: 'Tất cả điểm nhấn của địa điểm',
  incSeek: 'Tua tiến / lùi, chỉnh tốc độ',
  incBilingual: '5 ngôn ngữ: Việt, Anh, Hàn, Nhật, Trung',
  incValid: (h: string) => `Hiệu lực ${h} kể từ khi thanh toán`,
  incPeople: (n: number) => `Dùng chung tối đa ${n} người`,
  scopeSite: 'Áp dụng cho',
  scopeAll: (n: number) => `Toàn bộ ${n} điểm tham quan`,
  chooseSite: 'Chọn địa điểm',
  needSite: 'Vui lòng chọn địa điểm cho vé lẻ',
  perTicket: '/ vé',
  customer: 'Thông tin người mua (không bắt buộc)',
  name: 'Họ và tên',
  phone: 'Số điện thoại',
  continue: 'Tiếp tục thanh toán',
  haveCode: 'Đã có mã vé?',
  codeTitle: 'Nhập mã vé / mã khuyến mãi',
  codeDesc: 'Mã do ban quản lý, đại lý tour hoặc khách sạn cung cấp.',
  codePlaceholder: 'VD: HALONG',
  redeem: 'Kích hoạt',
  redeeming: 'Đang kiểm tra…',
  codeEmpty: 'Vui lòng nhập mã vé',
  back: 'Quay lại',
  close: 'Đóng',
  loading: 'Đang tải…',
  loadPkgError: 'Không tải được bảng giá. Vui lòng thử lại.',
  retry: 'Thử lại',
  orderId: 'Mã đơn',
  amount: 'Số tiền',
  package: 'Gói vé',
  tabBank: 'Quét mã VietQR',
  tabBankSub: 'Chuyển khoản ngân hàng',
  tabPhone: 'Ví điện tử / Thẻ',
  tabPhoneSub: 'Quét bằng điện thoại',
  bankHint:
    'Mở ứng dụng ngân hàng bất kỳ, chọn “Quét QR” và quét mã bên dưới. Số tiền và nội dung đã được điền sẵn.',
  bank: 'Ngân hàng',
  accountNo: 'Số tài khoản',
  accountName: 'Chủ tài khoản',
  note: 'Nội dung CK',
  noteWarn: 'Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống tự xác nhận.',
  autoConfirm: 'Hệ thống tự động xác nhận khi nhận được tiền (quản trị viên có thể xác nhận thủ công).',
  expiresIn: 'Mã thanh toán hết hạn sau',
  waiting: 'Đang chờ thanh toán…',
  copy: 'Sao chép',
  copied: 'Đã chép',
  phoneHint:
    'Dùng camera điện thoại quét mã này để mở cổng thanh toán SmartGuide Pay (MoMo, ZaloPay, thẻ ATM, Visa/Master).',
  openHere: 'Mở trang thanh toán trên thiết bị này',
  phoneWaiting: 'Sau khi thanh toán trên điện thoại, màn hình này sẽ tự mở khóa.',
  simulate: 'Môi trường demo: giả lập đã nhận chuyển khoản',
  expiredTitle: 'Mã thanh toán đã hết hạn',
  expiredDesc: 'Vì lý do an toàn, mỗi mã chỉ có hiệu lực 15 phút.',
  newCode: 'Tạo mã mới',
  cancelledTitle: 'Đơn hàng đã bị hủy',
  successTitle: 'Thanh toán thành công!',
  successRedeem: 'Kích hoạt vé thành công!',
  successDesc: 'Nội dung thuyết minh đầy đủ đã được mở khóa. Chúc bạn có chuyến tham quan thú vị!',
  ticket: 'Vé điện tử',
  validUntil: 'Hiệu lực đến',
  appliesTo: 'Áp dụng',
  keepListening: 'Tiếp tục nghe',
  autoClose: 'Tự động quay lại trình phát…',
  secure: 'Thanh toán bảo mật · Hoàn tiền nếu lỗi hệ thống',
  alreadyHave: 'Bạn đang có vé',
  errCreate: 'Không tạo được đơn hàng. Vui lòng thử lại.',
  step1: 'Chọn gói',
  step2: 'Thanh toán',
  step3: 'Hoàn tất',
  invalidCode: 'Mã không hợp lệ',
  connError: 'Lỗi kết nối',
  oneSite: '1 điểm tham quan',
  narrationMin: (n: number) => `${n} phút thuyết minh`,
  highlights: 'điểm nhấn'
};

type CheckoutTexts = typeof T_VI;

const T_EN: CheckoutTexts = {
  title: 'Unlock the full narration',
  subtitle: 'Pick a pass – pay securely with a QR code',
  reasonPreview: 'You have reached the end of the free preview. Get a pass to hear the full story.',
  reasonQr: 'Welcome to the attraction! Get a pass to hear the full narration.',
  reasonManual: 'Free preview – get a pass for the full story.',
  previewNote: (s: number) => `Without a pass: first ${s} seconds only`,
  included: 'Included',
  incFull: 'Full 3–4 minute narration',
  incExhibits: 'Every highlight of the site',
  incSeek: 'Seek forward / back, playback speed',
  incBilingual: '5 languages: Vietnamese, English, Korean, Japanese, Chinese',
  incValid: (h: string) => `Valid for ${h} after payment`,
  incPeople: (n: number) => `Shared by up to ${n} people`,
  scopeSite: 'Valid at',
  scopeAll: (n: number) => `All ${n} attractions`,
  chooseSite: 'Choose a site',
  needSite: 'Please choose a site for the single pass',
  perTicket: '/ pass',
  customer: 'Buyer details (optional)',
  name: 'Full name',
  phone: 'Phone number',
  continue: 'Continue to payment',
  haveCode: 'Have a ticket code?',
  codeTitle: 'Enter ticket / promo code',
  codeDesc: 'Codes are provided by the site management, tour agencies or hotels.',
  codePlaceholder: 'e.g. HALONG',
  redeem: 'Activate',
  redeeming: 'Checking…',
  codeEmpty: 'Please enter a code',
  back: 'Back',
  close: 'Close',
  loading: 'Loading…',
  loadPkgError: 'Could not load prices. Please try again.',
  retry: 'Retry',
  orderId: 'Order',
  amount: 'Amount',
  package: 'Pass',
  tabBank: 'Scan VietQR',
  tabBankSub: 'Bank transfer',
  tabPhone: 'E-wallet / Card',
  tabPhoneSub: 'Scan with your phone',
  bankHint:
    'Open any Vietnamese banking app, choose “Scan QR” and scan the code below. Amount and note are pre-filled.',
  bank: 'Bank',
  accountNo: 'Account no.',
  accountName: 'Account name',
  note: 'Transfer note',
  noteWarn: 'Keep the transfer note unchanged so the system can confirm automatically.',
  autoConfirm: 'Payment is confirmed automatically when received (an administrator can also confirm manually).',
  expiresIn: 'Payment code expires in',
  waiting: 'Waiting for payment…',
  copy: 'Copy',
  copied: 'Copied',
  phoneHint:
    'Scan this code with your phone camera to open the SmartGuide Pay gateway (MoMo, ZaloPay, ATM card, Visa/Master).',
  openHere: 'Open the payment page on this device',
  phoneWaiting: 'Once you pay on your phone, this screen unlocks automatically.',
  simulate: 'Demo environment: simulate a received transfer',
  expiredTitle: 'Payment code expired',
  expiredDesc: 'For security, each code is valid for 15 minutes only.',
  newCode: 'Generate a new code',
  cancelledTitle: 'This order was cancelled',
  successTitle: 'Payment successful!',
  successRedeem: 'Pass activated!',
  successDesc: 'The full narration is now unlocked. Enjoy your visit!',
  ticket: 'E-ticket',
  validUntil: 'Valid until',
  appliesTo: 'Applies to',
  keepListening: 'Keep listening',
  autoClose: 'Returning to the player…',
  secure: 'Secure payment · Refund on system errors',
  alreadyHave: 'You already have a pass',
  errCreate: 'Could not create the order. Please try again.',
  step1: 'Choose',
  step2: 'Pay',
  step3: 'Done',
  invalidCode: 'Invalid code',
  connError: 'Connection error',
  oneSite: '1 attraction',
  narrationMin: (n: number) => `${n} min narration`,
  highlights: 'highlights'
};

const T_KO: CheckoutTexts = {
  title: '전체 해설 잠금 해제',
  subtitle: '알맞은 이용권을 선택하고 QR 코드로 안전하게 결제하세요',
  reasonPreview: '무료 미리 듣기가 끝났어요. 이용권을 구매하면 해설 전체를 들을 수 있어요.',
  reasonQr: '관광지에 오신 것을 환영합니다! 이용권을 구매하고 해설 전체를 들어 보세요.',
  reasonManual: '무료로 미리 들어 보세요. 이용권을 구매하면 전체를 들을 수 있어요.',
  previewNote: (s: number) => `이용권이 없으면 처음 ${s}초만 들을 수 있어요`,
  included: '포함 내용',
  incFull: '3~4분 분량의 해설 전체 듣기',
  incExhibits: '관광지의 모든 하이라이트',
  incSeek: '앞뒤로 이동, 재생 속도 조절',
  incBilingual: '5개 언어: 베트남어, 영어, 한국어, 일본어, 중국어',
  incValid: (h: string) => `결제 후 ${h} 동안 유효`,
  incPeople: (n: number) => `최대 ${n}명까지 함께 이용`,
  scopeSite: '적용 관광지',
  scopeAll: (n: number) => `관광지 ${n}곳 전체`,
  chooseSite: '관광지 선택',
  needSite: '1개 관광지 이용권은 관광지를 선택해 주세요',
  perTicket: '/ 장',
  customer: '구매자 정보 (선택 사항)',
  name: '이름',
  phone: '전화번호',
  continue: '결제 계속하기',
  haveCode: '이용권 코드가 있으신가요?',
  codeTitle: '이용권 / 프로모션 코드 입력',
  codeDesc: '관리사무소, 여행사 또는 호텔에서 받은 코드를 입력하세요.',
  codePlaceholder: '예: HALONG',
  redeem: '활성화',
  redeeming: '확인 중…',
  codeEmpty: '이용권 코드를 입력해 주세요',
  back: '뒤로',
  close: '닫기',
  loading: '불러오는 중…',
  loadPkgError: '요금표를 불러오지 못했어요. 다시 시도해 주세요.',
  retry: '다시 시도',
  orderId: '주문 번호',
  amount: '금액',
  package: '이용권',
  tabBank: 'VietQR 스캔',
  tabBankSub: '은행 계좌 이체',
  tabPhone: '전자지갑 / 카드',
  tabPhoneSub: '휴대폰으로 스캔',
  bankHint:
    '베트남 은행 앱을 열고 “QR 스캔”을 선택한 뒤 아래 코드를 스캔하세요. 금액과 메모는 자동으로 입력돼요.',
  bank: '은행',
  accountNo: '계좌 번호',
  accountName: '예금주',
  note: '이체 메모',
  noteWarn: '시스템이 자동으로 확인할 수 있도록 이체 메모를 그대로 두세요.',
  autoConfirm: '입금이 확인되면 자동으로 승인됩니다(관리자가 직접 확인할 수도 있어요).',
  expiresIn: '결제 코드 만료까지',
  waiting: '결제를 기다리는 중…',
  copy: '복사',
  copied: '복사됨',
  phoneHint:
    '휴대폰 카메라로 이 코드를 스캔하면 SmartGuide Pay 결제 페이지(MoMo, ZaloPay, ATM 카드, Visa/Master)가 열려요.',
  openHere: '이 기기에서 결제 페이지 열기',
  phoneWaiting: '휴대폰에서 결제를 마치면 이 화면이 자동으로 잠금 해제돼요.',
  simulate: '데모 환경: 입금 완료 시뮬레이션',
  expiredTitle: '결제 코드가 만료되었어요',
  expiredDesc: '보안을 위해 각 코드는 15분 동안만 유효합니다.',
  newCode: '새 코드 만들기',
  cancelledTitle: '주문이 취소되었어요',
  successTitle: '결제가 완료되었어요!',
  successRedeem: '이용권이 활성화되었어요!',
  successDesc: '해설 전체가 잠금 해제되었어요. 즐거운 관광 되세요!',
  ticket: '전자 이용권',
  validUntil: '유효 기간',
  appliesTo: '적용 범위',
  keepListening: '계속 듣기',
  autoClose: '플레이어로 돌아가는 중…',
  secure: '안전한 결제 · 시스템 오류 시 환불',
  alreadyHave: '보유 중인 이용권',
  errCreate: '주문을 만들지 못했어요. 다시 시도해 주세요.',
  step1: '선택',
  step2: '결제',
  step3: '완료',
  invalidCode: '유효하지 않은 코드입니다',
  connError: '연결 오류가 발생했어요',
  oneSite: '관광지 1곳',
  narrationMin: (n: number) => `${n}분 해설`,
  highlights: '하이라이트'
};

const T_JA: CheckoutTexts = {
  title: '音声ガイドをすべて聴く',
  subtitle: 'チケットを選んで、QRコードで安全にお支払いください',
  reasonPreview: '無料試聴が終了しました。チケットを購入すると、ガイドを最後までお聴きいただけます。',
  reasonQr: '観光スポットへようこそ！チケットを購入して、ガイドを最後までお楽しみください。',
  reasonManual: '無料で試聴できます。チケットを購入すると全編をお聴きいただけます。',
  previewNote: (s: number) => `チケットなし：最初の${s}秒のみ試聴できます`,
  included: '含まれる内容',
  incFull: '3～4分の音声ガイドを全編視聴',
  incExhibits: 'スポットのすべての見どころ',
  incSeek: '早送り・巻き戻し、再生速度の変更',
  incBilingual: '5言語対応：ベトナム語・英語・韓国語・日本語・中国語',
  incValid: (h: string) => `お支払い後${h}有効`,
  incPeople: (n: number) => `最大${n}名まで共有可能`,
  scopeSite: '対象スポット',
  scopeAll: (n: number) => `全${n}か所の観光スポット`,
  chooseSite: 'スポットを選択',
  needSite: '1スポット券の対象スポットを選択してください',
  perTicket: '/ 枚',
  customer: '購入者情報（任意）',
  name: '氏名',
  phone: '電話番号',
  continue: 'お支払いへ進む',
  haveCode: 'チケットコードをお持ちですか？',
  codeTitle: 'チケット / プロモーションコードを入力',
  codeDesc: '管理事務所、旅行会社、ホテルから提供されたコードを入力してください。',
  codePlaceholder: '例：HALONG',
  redeem: '有効化',
  redeeming: '確認中…',
  codeEmpty: 'チケットコードを入力してください',
  back: '戻る',
  close: '閉じる',
  loading: '読み込み中…',
  loadPkgError: '料金表を読み込めませんでした。もう一度お試しください。',
  retry: '再試行',
  orderId: '注文番号',
  amount: '金額',
  package: 'チケット',
  tabBank: 'VietQRをスキャン',
  tabBankSub: '銀行振込',
  tabPhone: '電子ウォレット / カード',
  tabPhoneSub: 'スマートフォンでスキャン',
  bankHint:
    'ベトナムの銀行アプリを開き、「QRスキャン」を選んで下のコードを読み取ってください。金額とメモは自動入力されます。',
  bank: '銀行',
  accountNo: '口座番号',
  accountName: '口座名義',
  note: '振込メモ',
  noteWarn: 'システムが自動で確認できるよう、振込メモは変更しないでください。',
  autoConfirm: '入金を受け取ると自動で確認されます（管理者が手動で確認することもできます）。',
  expiresIn: '支払いコードの有効期限まで',
  waiting: 'お支払いをお待ちしています…',
  copy: 'コピー',
  copied: 'コピー済み',
  phoneHint:
    'スマートフォンのカメラでこのコードを読み取ると、SmartGuide Pay の決済ページ（MoMo、ZaloPay、ATMカード、Visa/Master）が開きます。',
  openHere: 'この端末で決済ページを開く',
  phoneWaiting: 'スマートフォンでお支払いが完了すると、この画面は自動的にロック解除されます。',
  simulate: 'デモ環境：入金をシミュレーション',
  expiredTitle: '支払いコードの有効期限が切れました',
  expiredDesc: '安全のため、各コードの有効期限は15分です。',
  newCode: '新しいコードを発行',
  cancelledTitle: 'この注文はキャンセルされました',
  successTitle: 'お支払いが完了しました！',
  successRedeem: 'チケットが有効になりました！',
  successDesc: '音声ガイドの全編がロック解除されました。楽しいご旅行を！',
  ticket: '電子チケット',
  validUntil: '有効期限',
  appliesTo: '対象',
  keepListening: '続けて聴く',
  autoClose: 'プレーヤーに戻ります…',
  secure: '安全なお支払い · システム障害時は返金',
  alreadyHave: 'お持ちのチケット',
  errCreate: '注文を作成できませんでした。もう一度お試しください。',
  step1: '選択',
  step2: '支払い',
  step3: '完了',
  invalidCode: '無効なコードです',
  connError: '接続エラーです',
  oneSite: '観光スポット1か所',
  narrationMin: (n: number) => `${n}分の音声ガイド`,
  highlights: '見どころ'
};

const T_ZH: CheckoutTexts = {
  title: '解锁完整语音讲解',
  subtitle: '选择合适的票种，通过二维码安全支付',
  reasonPreview: '免费试听已结束。购买通票即可收听完整讲解。',
  reasonQr: '欢迎来到景点！购买通票即可收听完整讲解。',
  reasonManual: '可免费试听，购买通票即可收听完整内容。',
  previewNote: (s: number) => `未购买通票：仅可试听前 ${s} 秒`,
  included: '包含内容',
  incFull: '完整收听 3–4 分钟讲解',
  incExhibits: '景点的所有亮点',
  incSeek: '快进 / 快退，调节播放速度',
  incBilingual: '5 种语言：越南语、英语、韩语、日语、中文',
  incValid: (h: string) => `付款后 ${h} 内有效`,
  incPeople: (n: number) => `最多 ${n} 人共享`,
  scopeSite: '适用景点',
  scopeAll: (n: number) => `全部 ${n} 个景点`,
  chooseSite: '选择景点',
  needSite: '请为单景点票选择景点',
  perTicket: '/ 张',
  customer: '购买人信息（选填）',
  name: '姓名',
  phone: '电话号码',
  continue: '继续付款',
  haveCode: '已有激活码？',
  codeTitle: '输入激活码 / 优惠码',
  codeDesc: '激活码由景区管理处、旅行社或酒店提供。',
  codePlaceholder: '例如：HALONG',
  redeem: '激活',
  redeeming: '正在验证…',
  codeEmpty: '请输入激活码',
  back: '返回',
  close: '关闭',
  loading: '加载中…',
  loadPkgError: '无法加载价格表，请重试。',
  retry: '重试',
  orderId: '订单号',
  amount: '金额',
  package: '票种',
  tabBank: '扫描 VietQR',
  tabBankSub: '银行转账',
  tabPhone: '电子钱包 / 银行卡',
  tabPhoneSub: '用手机扫码',
  bankHint: '打开任意越南银行 App，选择“扫码”并扫描下方二维码，金额和附言已自动填写。',
  bank: '银行',
  accountNo: '账号',
  accountName: '户名',
  note: '转账附言',
  noteWarn: '请勿修改转账附言，以便系统自动确认。',
  autoConfirm: '收到款项后系统将自动确认（管理员也可手动确认）。',
  expiresIn: '支付码剩余有效时间',
  waiting: '等待付款中…',
  copy: '复制',
  copied: '已复制',
  phoneHint: '用手机相机扫描此码，即可打开 SmartGuide Pay 支付页面（MoMo、ZaloPay、ATM 卡、Visa/Master）。',
  openHere: '在本设备上打开支付页面',
  phoneWaiting: '在手机上完成付款后，本页面将自动解锁。',
  simulate: '演示环境：模拟已收到转账',
  expiredTitle: '支付码已过期',
  expiredDesc: '为保障安全，每个支付码仅 15 分钟内有效。',
  newCode: '生成新支付码',
  cancelledTitle: '订单已取消',
  successTitle: '支付成功！',
  successRedeem: '门票已激活！',
  successDesc: '完整讲解已解锁，祝您游览愉快！',
  ticket: '电子票',
  validUntil: '有效期至',
  appliesTo: '适用范围',
  keepListening: '继续收听',
  autoClose: '正在返回播放器…',
  secure: '安全支付 · 系统故障可退款',
  alreadyHave: '您已有门票',
  errCreate: '无法创建订单，请重试。',
  step1: '选票',
  step2: '支付',
  step3: '完成',
  invalidCode: '激活码无效',
  connError: '连接错误',
  oneSite: '1 个景点',
  narrationMin: (n: number) => `${n} 分钟讲解`,
  highlights: '个亮点'
};

export const T: Record<LanguageCode, CheckoutTexts> = { vi: T_VI, en: T_EN, ko: T_KO, ja: T_JA, zh: T_ZH };

/** CSS riêng của luồng thanh toán (keyframes không có sẵn trong Tailwind CDN). */
export const CheckoutStyles: React.FC = () => (
  <style>{`
@keyframes hlco-pop { 0% { opacity: 0; transform: translateY(16px) scale(.97); } 100% { opacity: 1; transform: none; } }
@keyframes hlco-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes hlco-confetti { 0% { transform: translate3d(0,-10px,0) rotate(0deg); opacity: 1; } 100% { transform: translate3d(var(--dx), 460px, 0) rotate(var(--rot)); opacity: 0; } }
@keyframes hlco-check { 0% { stroke-dashoffset: 48; } 100% { stroke-dashoffset: 0; } }
@keyframes hlco-ring { 0% { transform: scale(.6); opacity: .9; } 100% { transform: scale(1.8); opacity: 0; } }
@keyframes hlco-bar { from { transform: scaleX(1); } to { transform: scaleX(0); } }
@keyframes hlco-scan { 0%,100% { top: 6%; } 50% { top: 90%; } }
.hlco-pop { animation: hlco-pop .32s cubic-bezier(.2,.8,.2,1) both; }
.hlco-fade { animation: hlco-fade .2s ease-out both; }
.hlco-piece { position: absolute; top: 0; animation: hlco-confetti 1.9s cubic-bezier(.2,.6,.4,1) forwards; }
.hlco-check path { stroke-dasharray: 48; animation: hlco-check .5s .15s ease-out both; }
.hlco-ring { animation: hlco-ring 1.4s ease-out infinite; }
.hlco-bar { transform-origin: left; animation-name: hlco-bar; animation-timing-function: linear; animation-fill-mode: forwards; }
.hlco-scanline { position: absolute; left: 6%; right: 6%; height: 2px; background: linear-gradient(90deg, transparent, #0ea5e9, transparent); box-shadow: 0 0 12px #38bdf8; animation: hlco-scan 2.6s ease-in-out infinite; }
`}</style>
);

const CONFETTI_COLORS = ['#0284c7', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#22c55e', '#ec4899'];

/** Hiệu ứng pháo giấy đơn giản bằng CSS. */
export const ConfettiBurst: React.FC<{ count?: number }> = ({ count = 44 }) => {
  const pieces = React.useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        dx: `${Math.round((Math.random() - 0.5) * 160)}px`,
        rot: `${Math.round(360 + Math.random() * 720)}deg`,
        delay: Math.random() * 0.5,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w: 6 + Math.round(Math.random() * 5),
        round: Math.random() > 0.7
      })),
    [count]
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="hlco-piece"
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              width: p.w,
              height: p.round ? p.w : Math.round(p.w * 1.7),
              borderRadius: p.round ? 999 : 2,
              animationDelay: `${p.delay}s`,
              '--dx': p.dx,
              '--rot': p.rot
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

/** Dấu tích thành công có hiệu ứng vẽ nét. */
export const SuccessCheck: React.FC<{ size?: number }> = ({ size = 72 }) => (
  <div className="relative mx-auto" style={{ width: size, height: size }}>
    <span className="hlco-ring absolute inset-0 rounded-full bg-emerald-400/40"></span>
    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
      <svg className="hlco-check" width={size * 0.5} height={size * 0.5} viewBox="0 0 36 36" fill="none">
        <path
          d="M8 18.5l6.5 6.5L28 11"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  </div>
);

/** Nút sao chép nhỏ có trạng thái "Đã chép". */
export const CopyButton: React.FC<{
  text: string;
  label: string;
  doneLabel: string;
  onCopy: (text: string) => Promise<boolean>;
  className?: string;
}> = ({ text, label, doneLabel, onCopy, className = '' }) => {
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      type="button"
      onClick={async () => setDone(await onCopy(text))}
      className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
        done ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
      } ${className}`}
    >
      <i className={`fa-solid ${done ? 'fa-check' : 'fa-copy'}`}></i>
      {done ? doneLabel : label}
    </button>
  );
};
