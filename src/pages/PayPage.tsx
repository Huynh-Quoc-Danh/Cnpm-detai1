// Cổng thanh toán SmartGuide Pay (môi trường demo) – mở khi khách quét QR thanh toán bằng điện thoại.
import React, { useCallback, useEffect, useState } from 'react';
import type { HeritageSite, LanguageCode, Order, PaymentMethod } from '../types';
import { api, ApiError, formatVnd } from '../services/api';
import { storeTicket } from '../components/checkout/ticketStorage';
import {
  CheckoutStyles,
  ConfettiBurst,
  SuccessCheck,
  formatCountdown,
  formatDateTime,
  packageNameFromLabel,
  ticketScopeLabel
} from '../components/checkout/checkoutShared';
import { isLanguageCode, siteName as siteNameOf, tr } from '../i18n';
import type { TrMap } from '../i18n';
import { LanguageDropdown } from '../i18n/LanguageDropdown';

export interface PayPageProps {
  orderId: string;
}

type GatewayMethod = 'momo' | 'zalopay' | 'atm' | 'visa';

const METHODS: Array<{
  key: GatewayMethod;
  api: PaymentMethod;
  name: TrMap;
  sub: TrMap;
  logo: React.ReactNode;
}> = [
  {
    key: 'momo',
    api: 'momo',
    name: { vi: 'Ví MoMo', en: 'MoMo e-wallet', ko: 'MoMo 전자지갑', ja: 'MoMo 電子ウォレット', zh: 'MoMo 电子钱包' },
    sub: {
      vi: 'Xác nhận bằng ứng dụng MoMo',
      en: 'Confirm in the MoMo app',
      ko: 'MoMo 앱에서 승인',
      ja: 'MoMoアプリで承認',
      zh: '在 MoMo App 中确认'
    },
    logo: <span className="w-10 h-10 rounded-xl bg-[#a50064] text-white text-[11px] font-black flex items-center justify-center">MoMo</span>
  },
  {
    key: 'zalopay',
    api: 'momo',
    name: { vi: 'Ví ZaloPay', en: 'ZaloPay e-wallet', ko: 'ZaloPay 전자지갑', ja: 'ZaloPay 電子ウォレット', zh: 'ZaloPay 电子钱包' },
    sub: {
      vi: 'Xác nhận bằng ứng dụng ZaloPay',
      en: 'Confirm in the ZaloPay app',
      ko: 'ZaloPay 앱에서 승인',
      ja: 'ZaloPayアプリで承認',
      zh: '在 ZaloPay App 中确认'
    },
    logo: <span className="w-10 h-10 rounded-xl bg-[#0068ff] text-white text-[10px] font-black flex items-center justify-center">Zalo<br />Pay</span>
  },
  {
    key: 'atm',
    api: 'card',
    name: { vi: 'Thẻ ATM nội địa', en: 'Domestic ATM card', ko: '베트남 국내 ATM 카드', ja: 'ベトナム国内ATMカード', zh: '越南本地 ATM 卡' },
    sub: {
      vi: 'Hỗ trợ 40+ ngân hàng qua NAPAS',
      en: '40+ banks via NAPAS',
      ko: 'NAPAS를 통해 40개 이상 은행 지원',
      ja: 'NAPAS経由で40以上の銀行に対応',
      zh: '通过 NAPAS 支持 40 多家银行'
    },
    logo: (
      <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
        <i className="fa-solid fa-building-columns"></i>
      </span>
    )
  },
  {
    key: 'visa',
    api: 'card',
    name: { vi: 'Thẻ Visa / Mastercard', en: 'Visa / Mastercard', ko: 'Visa / Mastercard', ja: 'Visa / Mastercard', zh: 'Visa / 万事达卡' },
    sub: {
      vi: 'Thẻ tín dụng, ghi nợ quốc tế',
      en: 'International credit / debit card',
      ko: '해외 신용카드 / 체크카드',
      ja: '国際クレジット / デビットカード',
      zh: '国际信用卡 / 借记卡'
    },
    logo: (
      <span className="w-10 h-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center text-lg">
        <i className="fa-brands fa-cc-visa"></i>
      </span>
    )
  }
];

const TXT_VI = {
  gateway: 'Cổng thanh toán SmartGuide Pay',
  sandbox: 'Môi trường demo',
  merchant: 'Đơn vị chấp nhận',
  merchantName: 'Hạ Long SmartGuide – Thuyết minh tự động',
  order: 'Mã đơn hàng',
  product: 'Sản phẩm',
  site: 'Địa điểm',
  total: 'Tổng thanh toán',
  expiresIn: 'Giao dịch hết hạn sau',
  choose: 'Chọn phương thức thanh toán',
  testCard: 'Thẻ thử nghiệm',
  pay: (a: string) => `Thanh toán ${a}`,
  processing: ['Đang kết nối nhà cung cấp…', 'Đang xác thực giao dịch…', 'Đang phát hành vé điện tử…'],
  successTitle: 'Thanh toán thành công',
  successDesc: 'Quay lại màn hình thuyết minh, nội dung sẽ tự mở khóa.',
  receipt: 'Biên nhận',
  paidAt: 'Thời gian',
  method: 'Phương thức',
  validUntil: 'Vé có hiệu lực đến',
  appliesTo: 'Áp dụng',
  openApp: 'Mở ứng dụng trên điện thoại này',
  openAppDesc: 'Vé sẽ được lưu trên điện thoại này để bạn nghe thuyết minh ngay.',
  loading: 'Đang tải đơn hàng…',
  notFound: 'Không tìm thấy đơn hàng',
  notFoundDesc: 'Mã đơn không tồn tại hoặc đã bị xóa. Vui lòng tạo đơn mới trong ứng dụng.',
  expired: 'Giao dịch đã hết hạn',
  expiredDesc: 'Mã thanh toán chỉ có hiệu lực 15 phút. Vui lòng quay lại ứng dụng và bấm “Tạo mã mới”.',
  cancelled: 'Đơn hàng đã bị hủy',
  refunded: 'Đơn hàng đã được hoàn tiền',
  cancelledDesc: 'Đơn này không còn hiệu lực thanh toán.',
  error: 'Không kết nối được máy chủ',
  retry: 'Thử lại',
  backApp: 'Về ứng dụng',
  secure: 'Kết nối được mã hóa · Chuẩn PCI DSS (mô phỏng)',
  fine: 'Đây là cổng thanh toán mô phỏng (sandbox) phục vụ đồ án – không phát sinh giao dịch hay trừ tiền thật.',
  methodNames: { vietqr: 'Chuyển khoản VietQR', momo: 'Ví điện tử', card: 'Thẻ ngân hàng' } as Record<string, string>
};

type PayTexts = typeof TXT_VI;

const TXT_EN: PayTexts = {
  gateway: 'SmartGuide Pay gateway',
  sandbox: 'Demo environment',
  merchant: 'Merchant',
  merchantName: 'Ha Long SmartGuide – Audio guide',
  order: 'Order ID',
  product: 'Product',
  site: 'Site',
  total: 'Total',
  expiresIn: 'Transaction expires in',
  choose: 'Choose a payment method',
  testCard: 'Test card',
  pay: (a: string) => `Pay ${a}`,
  processing: ['Connecting to provider…', 'Authorising transaction…', 'Issuing your e-ticket…'],
  successTitle: 'Payment successful',
  successDesc: 'Return to the narration screen – the content unlocks automatically.',
  receipt: 'Receipt',
  paidAt: 'Time',
  method: 'Method',
  validUntil: 'Ticket valid until',
  appliesTo: 'Applies to',
  openApp: 'Open the app on this phone',
  openAppDesc: 'The ticket is saved on this phone so you can listen right away.',
  loading: 'Loading order…',
  notFound: 'Order not found',
  notFoundDesc: 'This order does not exist. Please create a new one in the app.',
  expired: 'Transaction expired',
  expiredDesc: 'Payment codes are valid for 15 minutes. Go back to the app and tap “Generate a new code”.',
  cancelled: 'Order cancelled',
  refunded: 'Order refunded',
  cancelledDesc: 'This order can no longer be paid.',
  error: 'Cannot reach the server',
  retry: 'Retry',
  backApp: 'Back to the app',
  secure: 'Encrypted connection · PCI DSS (simulated)',
  fine: 'This is a simulated (sandbox) payment gateway for a student project – no real money is charged.',
  methodNames: { vietqr: 'VietQR transfer', momo: 'E-wallet', card: 'Bank card' } as Record<string, string>
};

const TXT_KO: PayTexts = {
  gateway: 'SmartGuide Pay 결제 페이지',
  sandbox: '데모 환경',
  merchant: '가맹점',
  merchantName: '하롱 SmartGuide – 오디오 가이드',
  order: '주문 번호',
  product: '상품',
  site: '관광지',
  total: '결제 금액',
  expiresIn: '거래 만료까지',
  choose: '결제 수단 선택',
  testCard: '테스트 카드',
  pay: (a: string) => `${a} 결제하기`,
  processing: ['결제사에 연결하는 중…', '거래를 인증하는 중…', '전자 이용권을 발급하는 중…'],
  successTitle: '결제가 완료되었어요',
  successDesc: '해설 화면으로 돌아가면 콘텐츠가 자동으로 잠금 해제돼요.',
  receipt: '영수증',
  paidAt: '결제 시간',
  method: '결제 수단',
  validUntil: '이용권 유효 기간',
  appliesTo: '적용 범위',
  openApp: '이 휴대폰에서 앱 열기',
  openAppDesc: '이용권이 이 휴대폰에 저장되어 바로 해설을 들을 수 있어요.',
  loading: '주문을 불러오는 중…',
  notFound: '주문을 찾을 수 없어요',
  notFoundDesc: '존재하지 않거나 삭제된 주문입니다. 앱에서 새 주문을 만들어 주세요.',
  expired: '거래가 만료되었어요',
  expiredDesc: '결제 코드는 15분 동안만 유효해요. 앱으로 돌아가 “새 코드 만들기”를 눌러 주세요.',
  cancelled: '주문이 취소되었어요',
  refunded: '주문이 환불되었어요',
  cancelledDesc: '이 주문은 더 이상 결제할 수 없어요.',
  error: '서버에 연결할 수 없어요',
  retry: '다시 시도',
  backApp: '앱으로 돌아가기',
  secure: '암호화된 연결 · PCI DSS (모의)',
  fine: '학생 프로젝트용 모의(샌드박스) 결제 페이지로, 실제 거래나 출금은 발생하지 않아요.',
  methodNames: { vietqr: 'VietQR 계좌 이체', momo: '전자지갑', card: '은행 카드' } as Record<string, string>
};

const TXT_JA: PayTexts = {
  gateway: 'SmartGuide Pay 決済ページ',
  sandbox: 'デモ環境',
  merchant: '加盟店',
  merchantName: 'ハロン SmartGuide – 音声ガイド',
  order: '注文番号',
  product: '商品',
  site: 'スポット',
  total: 'お支払い金額',
  expiresIn: '取引の有効期限まで',
  choose: 'お支払い方法を選択',
  testCard: 'テストカード',
  pay: (a: string) => `${a} を支払う`,
  processing: ['決済事業者に接続しています…', '取引を認証しています…', '電子チケットを発行しています…'],
  successTitle: 'お支払いが完了しました',
  successDesc: 'ガイド画面に戻ると、コンテンツが自動的にロック解除されます。',
  receipt: '領収書',
  paidAt: '日時',
  method: 'お支払い方法',
  validUntil: 'チケット有効期限',
  appliesTo: '対象',
  openApp: 'このスマートフォンでアプリを開く',
  openAppDesc: 'チケットはこのスマートフォンに保存され、すぐにガイドをお聴きいただけます。',
  loading: '注文を読み込み中…',
  notFound: '注文が見つかりません',
  notFoundDesc: 'この注文は存在しないか、削除されました。アプリで新しい注文を作成してください。',
  expired: '取引の有効期限が切れました',
  expiredDesc: '支払いコードの有効期限は15分です。アプリに戻り「新しいコードを発行」を押してください。',
  cancelled: '注文はキャンセルされました',
  refunded: '注文は返金されました',
  cancelledDesc: 'この注文はお支払いできなくなりました。',
  error: 'サーバーに接続できません',
  retry: '再試行',
  backApp: 'アプリに戻る',
  secure: '暗号化された接続 · PCI DSS（模擬）',
  fine: 'これは学生プロジェクト用の模擬（サンドボックス）決済ページです。実際の取引や引き落としは発生しません。',
  methodNames: { vietqr: 'VietQR 振込', momo: '電子ウォレット', card: '銀行カード' } as Record<string, string>
};

const TXT_ZH: PayTexts = {
  gateway: 'SmartGuide Pay 支付网关',
  sandbox: '演示环境',
  merchant: '收款商户',
  merchantName: '下龙 SmartGuide – 语音导览',
  order: '订单号',
  product: '商品',
  site: '景点',
  total: '应付金额',
  expiresIn: '交易剩余有效时间',
  choose: '选择支付方式',
  testCard: '测试卡',
  pay: (a: string) => `支付 ${a}`,
  processing: ['正在连接支付服务商…', '正在验证交易…', '正在出具电子票…'],
  successTitle: '支付成功',
  successDesc: '返回讲解页面后，内容将自动解锁。',
  receipt: '收据',
  paidAt: '时间',
  method: '支付方式',
  validUntil: '门票有效期至',
  appliesTo: '适用范围',
  openApp: '在这部手机上打开应用',
  openAppDesc: '门票将保存在这部手机上，您可以立即收听讲解。',
  loading: '正在加载订单…',
  notFound: '未找到订单',
  notFoundDesc: '订单不存在或已被删除，请在应用中重新下单。',
  expired: '交易已过期',
  expiredDesc: '支付码仅 15 分钟内有效。请返回应用并点击“生成新支付码”。',
  cancelled: '订单已取消',
  refunded: '订单已退款',
  cancelledDesc: '该订单已无法支付。',
  error: '无法连接服务器',
  retry: '重试',
  backApp: '返回应用',
  secure: '加密连接 · PCI DSS（模拟）',
  fine: '这是为学生项目搭建的模拟（沙盒）支付网关，不会产生真实交易或扣款。',
  methodNames: { vietqr: 'VietQR 转账', momo: '电子钱包', card: '银行卡' } as Record<string, string>
};

const TXT: Record<LanguageCode, PayTexts> = { vi: TXT_VI, en: TXT_EN, ko: TXT_KO, ja: TXT_JA, zh: TXT_ZH };

function initialLang(): LanguageCode {
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (isLanguageCode(q)) return q;
  } catch {
    /* ignore */
  }
  try {
    const stored = localStorage.getItem('app_lang');
    if (isLanguageCode(stored)) return stored;
  } catch {
    /* ignore */
  }
  return 'vi';
}

const PayPage: React.FC<PayPageProps> = ({ orderId }) => {
  const [lang, setLang] = useState<LanguageCode>(initialLang);
  const [langTouched, setLangTouched] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading');
  const [site, setSite] = useState<HeritageSite | null>(null);
  const [method, setMethod] = useState<GatewayMethod>('momo');
  const [processing, setProcessing] = useState<number | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const t = TXT[lang] || TXT.vi;

  const load = useCallback(async () => {
    try {
      const o = await api.getOrder(orderId);
      setOrder(o);
      setState('ready');
      if (!langTouched && isLanguageCode(o.lang)) setLang(o.lang);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setState('notfound');
      else setState((s) => (s === 'ready' ? s : 'error'));
    }
  }, [orderId, langTouched]);

  useEffect(() => {
    document.title = `SmartGuide Pay · ${orderId}`;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Thăm dò nếu đơn đang chờ (có thể được xác nhận từ nơi khác)
  useEffect(() => {
    if (!order || order.status !== 'pending' || processing !== null) return;
    const iv = window.setInterval(() => void load(), 3000);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(iv);
      window.clearInterval(tick);
    };
  }, [order, processing, load]);

  useEffect(() => {
    if (order?.siteId == null) return;
    api
      .getSite(order.siteId)
      .then(setSite)
      .catch(() => undefined);
  }, [order?.siteId]);

  const pay = async () => {
    if (!order) return;
    setPayError(null);
    const m = METHODS.find((x) => x.key === method)!;
    // Hiệu ứng xử lý ngắn như cổng thật
    for (let i = 0; i < 3; i++) {
      setProcessing(i);
      await new Promise((r) => setTimeout(r, 650));
    }
    try {
      const o = await api.payOrder(order.id, m.api);
      setOrder(o);
    } catch (e: any) {
      setPayError((e && e.message) || t.error);
      void load();
    } finally {
      setProcessing(null);
    }
  };

  const openApp = () => {
    if (order?.ticket) storeTicket(order.ticket);
    const siteQ = order?.siteId != null ? `&site=${order.siteId}` : '';
    window.location.href = `/?src=app${siteQ}`;
  };

  const expiresMs = order ? new Date(order.expiresAt).getTime() - now : 0;
  const status = order
    ? order.status === 'pending' && expiresMs <= 0
      ? 'expired'
      : order.status
    : null;
  const siteTitle = site ? siteNameOf(site, lang) : null;
  const selectedMethod = METHODS.find((x) => x.key === method)!;

  // ---------- Khung trang ----------
  const shell = (content: React.ReactNode) => (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <CheckoutStyles />
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 text-white flex items-center justify-center">
            <i className="fa-solid fa-shield-halved text-sm"></i>
          </div>
          <div className="leading-tight min-w-0 flex-1">
            <p className="font-black text-[15px] tracking-tight">
              SmartGuide <span className="text-sky-600">Pay</span>
            </p>
            <p className="text-[10px] text-slate-500 truncate">{t.gateway}</p>
          </div>
          <span className="hidden min-[360px]:inline px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap">
            {t.sandbox}
          </span>
          <div className="ml-1">
            <LanguageDropdown
              lang={lang}
              compact
              onChange={(l) => {
                setLang(l);
                setLangTouched(true);
              }}
            />
          </div>
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 py-5 pb-10">
        {content}
        <div className="mt-6 text-center space-y-1.5">
          <p className="text-[11px] text-slate-500">
            <i className="fa-solid fa-lock mr-1"></i>
            {t.secure}
          </p>
          <p className="text-[10px] text-slate-400 leading-relaxed px-4">{t.fine}</p>
        </div>
      </main>
    </div>
  );

  const stateCard = (icon: string, color: string, title: string, desc: string, action?: React.ReactNode) => (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-7 text-center hlco-pop">
      <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl ${color}`}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <h1 className="mt-4 text-lg font-black">{title}</h1>
      <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed">{desc}</p>
      {action}
      <a href="/" className="mt-4 inline-block text-[13px] font-bold text-sky-700">
        <i className="fa-solid fa-arrow-left mr-1.5"></i>
        {t.backApp}
      </a>
    </div>
  );

  if (state === 'loading')
    return shell(
      <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-500">
        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-sky-600"></i>
        <p className="mt-3 text-sm font-semibold">{t.loading}</p>
      </div>
    );
  if (state === 'notfound')
    return shell(stateCard('fa-magnifying-glass', 'bg-slate-100 text-slate-500', t.notFound, t.notFoundDesc));
  if (state === 'error' || !order)
    return shell(
      stateCard(
        'fa-wifi',
        'bg-rose-100 text-rose-600',
        t.error,
        orderId,
        <button
          onClick={() => {
            setState('loading');
            void load();
          }}
          className="mt-4 block mx-auto px-5 py-2.5 rounded-full bg-sky-600 text-white text-[13px] font-extrabold"
        >
          <i className="fa-solid fa-rotate-right mr-1.5"></i>
          {t.retry}
        </button>
      )
    );

  // ---------- Thành công ----------
  if (status === 'paid') {
    const tk = order.ticket;
    return shell(
      <div className="relative">
        <ConfettiBurst />
        <div className="relative bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hlco-pop">
          <div className="px-6 pt-8 pb-5 text-center">
            <SuccessCheck />
            <h1 className="mt-5 text-xl font-black">{t.successTitle}</h1>
            <p className="mt-1 text-2xl font-black text-emerald-600">{formatVnd(order.amount)}</p>
            <p className="mt-2 text-[13px] text-slate-500 leading-relaxed">{t.successDesc}</p>
          </div>
          <div className="mx-5 border-t border-dashed border-slate-300"></div>
          <dl className="px-6 py-4 space-y-2 text-[13px]">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{t.receipt}</p>
            <ReceiptRow label={t.order} value={order.id} mono />
            <ReceiptRow label={t.product} value={packageNameFromLabel(order.packageName, lang)} />
            {siteTitle && <ReceiptRow label={t.site} value={siteTitle} />}
            <ReceiptRow label={t.method} value={t.methodNames[order.method] || order.method} />
            <ReceiptRow label={t.paidAt} value={formatDateTime(order.paidAt, lang)} />
            {tk && (
              <>
                <ReceiptRow label={t.appliesTo} value={ticketScopeLabel(tk, lang, (id) => (id === site?.id ? siteTitle || undefined : undefined))} />
                <ReceiptRow label={t.validUntil} value={formatDateTime(tk.expiresAt, lang)} strong />
              </>
            )}
          </dl>
          <div className="px-5 pb-6">
            <button
              onClick={openApp}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-sky-600/25"
            >
              <i className="fa-solid fa-mobile-screen-button mr-2"></i>
              {t.openApp}
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-400">{t.openAppDesc}</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'expired')
    return shell(stateCard('fa-hourglass-end', 'bg-amber-100 text-amber-600', t.expired, t.expiredDesc));
  if (status === 'cancelled' || status === 'refunded')
    return shell(
      stateCard('fa-ban', 'bg-rose-100 text-rose-600', status === 'refunded' ? t.refunded : t.cancelled, t.cancelledDesc)
    );

  // ---------- Chờ thanh toán ----------
  return shell(
    <div className="space-y-4 hlco-pop">
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-sky-600 to-teal-500 px-5 py-5 text-white">
          <p className="text-[11px] uppercase tracking-wider text-sky-100 font-bold">{t.total}</p>
          <p className="text-3xl font-black tracking-tight mt-0.5">{formatVnd(order.amount)}</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[12px]">
            <i className="fa-regular fa-clock"></i>
            {t.expiresIn} <b className="font-mono tabular-nums">{formatCountdown(expiresMs)}</b>
          </div>
        </div>
        <dl className="px-5 py-4 space-y-2 text-[13px]">
          <ReceiptRow label={t.merchant} value={t.merchantName} />
          <ReceiptRow label={t.order} value={order.id} mono />
          <ReceiptRow label={t.product} value={packageNameFromLabel(order.packageName, lang)} />
          {siteTitle && <ReceiptRow label={t.site} value={siteTitle} />}
        </dl>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4">
        <p className="px-1 pb-3 text-[13px] font-extrabold text-slate-800">{t.choose}</p>
        <div className="space-y-2" role="radiogroup">
          {METHODS.map((m) => {
            const active = m.key === method;
            return (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMethod(m.key)}
                className={`w-full flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${
                  active ? 'border-sky-500 bg-sky-50/60' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {m.logo}
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-[14px] text-slate-900 break-words">{tr(lang, m.name)}</span>
                  <span className="block text-[11px] text-slate-500">{tr(lang, m.sub)}</span>
                </span>
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    active ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300'
                  }`}
                >
                  {active && <i className="fa-solid fa-check text-[9px]"></i>}
                </span>
              </button>
            );
          })}
        </div>
        {(method === 'atm' || method === 'visa') && (
          <div className="mt-3 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-[12px] text-slate-600">
            <span className="font-bold">{t.testCard}:</span>{' '}
            <span className="font-mono">{method === 'visa' ? '4111 1111 1111 1111 · 12/30 · 123' : '9704 0000 0000 0018 · NGUYEN VAN A'}</span>
          </div>
        )}
      </section>

      {payError && (
        <p className="text-[13px] font-semibold text-rose-600 text-center">
          <i className="fa-solid fa-circle-exclamation mr-1"></i>
          {payError}
        </p>
      )}

      <button
        onClick={() => void pay()}
        disabled={processing !== null}
        className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[15px] shadow-lg disabled:opacity-70 transition"
      >
        <i className="fa-solid fa-lock mr-2"></i>
        {t.pay(formatVnd(order.amount))}
      </button>

      {processing !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6 hlco-fade">
          <div className="bg-white rounded-3xl p-7 w-full max-w-xs text-center shadow-2xl hlco-pop">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-sky-600 border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">{selectedMethod.logo}</div>
            </div>
            <p className="mt-4 font-extrabold text-slate-900">{tr(lang, selectedMethod.name)}</p>
            <ul className="mt-3 space-y-1.5 text-left">
              {t.processing.map((step, i) => (
                <li
                  key={step}
                  className={`text-[12px] flex items-center gap-2 ${
                    i < processing ? 'text-emerald-600' : i === processing ? 'text-slate-800 font-semibold' : 'text-slate-300'
                  }`}
                >
                  <i
                    className={`fa-solid ${
                      i < processing ? 'fa-circle-check' : i === processing ? 'fa-circle-notch fa-spin' : 'fa-circle'
                    } w-4`}
                  ></i>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

const ReceiptRow: React.FC<{ label: string; value: string; mono?: boolean; strong?: boolean }> = ({
  label,
  value,
  mono,
  strong
}) => (
  <div className="flex items-start justify-between gap-4">
    <dt className="text-slate-500 shrink-0">{label}</dt>
    <dd
      className={`text-right min-w-0 break-words ${mono ? 'font-mono' : ''} ${
        strong ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-800'
      }`}
    >
      {value}
    </dd>
  </div>
);

export default PayPage;
