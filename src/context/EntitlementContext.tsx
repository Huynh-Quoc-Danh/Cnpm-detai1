// Quyền nghe (vé điện tử): lưu NHIỀU vé trên thiết bị, xác minh định kỳ, mở cửa sổ thanh toán.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { LanguageCode, Ticket } from '../types';
import { api, ApiError } from '../services/api';
import { CheckoutModal } from '../components/checkout/CheckoutModal';
import { tr } from '../i18n';

import {
  PENDING_ORDER_KEY,
  TICKET_CACHE_KEY,
  TICKET_TOKEN_KEY,
  TICKET_TOKENS_KEY,
  isTicketValid,
  pickPrimary,
  readPendingOrder,
  readStoredTickets,
  rememberPendingOrder,
  removeStoredTicket,
  storeTicket,
  ticketCovers,
  ticketFor
} from '../components/checkout/ticketStorage';

export {
  TICKET_TOKEN_KEY,
  getStoredTicketToken,
  storeTicket,
  rememberPendingOrder,
  ticketCovers
} from '../components/checkout/ticketStorage';

export type CheckoutReason = 'preview-ended' | 'manual' | 'qr';

export interface OpenCheckoutOptions {
  siteId?: number;
  reason?: CheckoutReason;
}

export interface EntitlementContextValue {
  /** Vé "chính" (phạm vi rộng nhất, hết hạn muộn nhất). */
  ticket: Ticket | null;
  token: string | null;
  /** Mọi vé còn hiệu lực trên thiết bị. */
  tickets: Ticket[];
  /** Token của vé bao phủ điểm siteId (null nếu chưa có). */
  tokenFor: (siteId: number) => string | null;
  hasAccess: (siteId: number) => boolean;
  openCheckout: (opts?: OpenCheckoutOptions) => void;
  closeCheckout: () => void;
  redeemCode: (code: string) => Promise<{ ok: boolean; message?: string }>;
  refresh: () => Promise<void>;
  logout: () => void;
  /** Extra: checkout modal state. */
  checkoutOpen: boolean;
  /** Extra: lưu vé lấy từ nơi khác (PayPage...). Vé được THÊM vào danh sách, không thay vé cũ. */
  applyTicket: (ticket: Ticket) => void;
}

const EntitlementContext = createContext<EntitlementContextValue | null>(null);

function sameList(a: Ticket[], b: Ticket[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].token !== b[i].token || a[i].expiresAt !== b[i].expiresAt) return false;
  }
  return true;
}

export const EntitlementProvider: React.FC<{ lang: LanguageCode; children: React.ReactNode }> = ({
  lang,
  children
}) => {
  const [allTickets, setAllTickets] = useState<Ticket[]>(() => readStoredTickets());
  const [now, setNow] = useState(() => Date.now());
  const [checkout, setCheckout] = useState<{ open: boolean; siteId?: number; reason?: CheckoutReason; seq: number }>(
    { open: false, seq: 0 }
  );
  const refreshing = useRef(false);

  const syncFromStorage = useCallback(() => {
    const stored = readStoredTickets();
    setAllTickets((prev) => (sameList(prev, stored) ? prev : stored));
    return stored;
  }, []);

  const applyTicket = useCallback(
    (t: Ticket) => {
      storeTicket(t); // thêm vào danh sách, giữ nguyên các vé đã mua trước đó
      rememberPendingOrder(null);
      syncFromStorage();
      setNow(Date.now());
    },
    [syncFromStorage]
  );

  const clear = useCallback(() => {
    storeTicket(null);
    setAllTickets([]);
  }, []);

  const checkPendingOrder = useCallback(async () => {
    const pending = readPendingOrder();
    if (!pending) return;
    if (new Date(pending.expiresAt).getTime() + 60_000 < Date.now()) {
      rememberPendingOrder(null);
      return;
    }
    try {
      const o = await api.getOrder(pending.id);
      if (o.status === 'paid' && o.ticket) applyTicket(o.ticket);
      else if (o.status !== 'pending') rememberPendingOrder(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) rememberPendingOrder(null);
    }
  }, [applyTicket]);

  const refresh = useCallback(async () => {
    setNow(Date.now());
    // Đồng bộ với tab khác / PayPage trên cùng thiết bị
    const stored = syncFromStorage();
    if (!refreshing.current) {
      refreshing.current = true;
      try {
        for (const tk of stored) {
          if (!isTicketValid(tk)) {
            removeStoredTicket(tk.token);
            continue;
          }
          try {
            const r = await api.verifyTicket(tk.token);
            if (!readStoredTickets().some((x) => x.token === tk.token)) continue; // đã bị xoá trong lúc chờ
            if (r.valid && r.ticket) storeTicket(r.ticket);
            else removeStoredTicket(tk.token);
          } catch (e) {
            // Lỗi mạng: giữ vé đã lưu; 401/404 => vé không hợp lệ
            if (e instanceof ApiError && (e.status === 401 || e.status === 404)) removeStoredTicket(tk.token);
          }
        }
      } finally {
        refreshing.current = false;
      }
      syncFromStorage();
    }
    await checkPendingOrder();
  }, [checkPendingOrder, syncFromStorage]);

  // Xác minh khi mở app, mỗi 60 giây và khi quay lại cửa sổ
  useEffect(() => {
    void refresh();
    const iv = window.setInterval(() => void refresh(), 60_000);
    const onFocus = () => void refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === TICKET_TOKEN_KEY ||
        e.key === TICKET_TOKENS_KEY ||
        e.key === TICKET_CACHE_KEY ||
        e.key === PENDING_ORDER_KEY
      )
        void refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh]);

  // Kiểm tra nhanh đơn đang chờ (khách trả tiền trên điện thoại sau khi đóng cửa sổ)
  useEffect(() => {
    if (checkout.open) return;
    const iv = window.setInterval(() => {
      if (readPendingOrder()) void checkPendingOrder();
    }, 5_000);
    return () => window.clearInterval(iv);
  }, [checkout.open, checkPendingOrder]);

  const validTickets = useMemo(() => allTickets.filter((t) => isTicketValid(t, now)), [allTickets, now]);
  const validTicket = useMemo(() => pickPrimary(validTickets, now), [validTickets, now]);

  // Vé hết hạn sớm nhất => cập nhật lại giao diện đúng thời điểm
  useEffect(() => {
    if (!validTickets.length) return;
    const ms = Math.min(...validTickets.map((t) => new Date(t.expiresAt).getTime())) - Date.now();
    if (!isFinite(ms) || ms <= 0 || ms > 2 ** 31 - 1) return;
    const t = window.setTimeout(() => setNow(Date.now()), ms + 500);
    return () => window.clearTimeout(t);
  }, [validTickets]);

  const hasAccess = useCallback(
    (siteId: number) => validTickets.some((t) => ticketCovers(t, siteId, now)),
    [validTickets, now]
  );

  const tokenFor = useCallback(
    (siteId: number) => {
      const t = ticketFor(validTickets, siteId, now);
      return t ? t.token : null;
    },
    [validTickets, now]
  );

  const openCheckout = useCallback((opts: OpenCheckoutOptions = {}) => {
    setCheckout((c) => ({ open: true, siteId: opts.siteId, reason: opts.reason || 'manual', seq: c.seq + 1 }));
  }, []);

  const closeCheckout = useCallback(() => setCheckout((c) => ({ ...c, open: false })), []);

  const redeemCode = useCallback(
    async (code: string) => {
      const c = (code || '').trim();
      if (!c) return { ok: false, message: tr(lang, { vi: 'Vui lòng nhập mã vé', en: 'Please enter a code', ko: '이용권 코드를 입력해 주세요', ja: 'チケットコードを入力してください', zh: '请输入激活码' }) };
      try {
        const r = await api.redeemCode(c);
        if (r.ok && r.ticket) {
          applyTicket(r.ticket);
          return { ok: true, message: r.message };
        }
        return { ok: false, message: r.message || tr(lang, { vi: 'Mã không hợp lệ', en: 'Invalid code', ko: '유효하지 않은 코드입니다', ja: '無効なコードです', zh: '激活码无效' }) };
      } catch (e: any) {
        return { ok: false, message: (e && e.message) || tr(lang, { vi: 'Lỗi kết nối', en: 'Connection error', ko: '연결 오류가 발생했어요', ja: '接続エラーです', zh: '连接错误' }) };
      }
    },
    [applyTicket, lang]
  );

  const logout = useCallback(() => {
    clear();
    rememberPendingOrder(null);
  }, [clear]);

  const value = useMemo<EntitlementContextValue>(
    () => ({
      ticket: validTicket,
      token: validTicket ? validTicket.token : null,
      tickets: validTickets,
      tokenFor,
      hasAccess,
      openCheckout,
      closeCheckout,
      redeemCode,
      refresh,
      logout,
      checkoutOpen: checkout.open,
      applyTicket
    }),
    [validTicket, validTickets, tokenFor, hasAccess, openCheckout, closeCheckout, redeemCode, refresh, logout, checkout.open, applyTicket]
  );

  return (
    <EntitlementContext.Provider value={value}>
      {children}
      <CheckoutModal
        key={checkout.seq}
        isOpen={checkout.open}
        onClose={closeCheckout}
        lang={lang}
        siteId={checkout.siteId ?? null}
        reason={checkout.reason}
        currentTicket={validTicket}
        onSuccess={applyTicket}
      />
    </EntitlementContext.Provider>
  );
};

export function useEntitlement(): EntitlementContextValue {
  const ctx = useContext(EntitlementContext);
  if (!ctx) throw new Error('useEntitlement() must be used inside <EntitlementProvider>');
  return ctx;
}

/** Như useEntitlement nhưng trả null khi nằm ngoài Provider. */
export function useOptionalEntitlement(): EntitlementContextValue | null {
  return useContext(EntitlementContext);
}
