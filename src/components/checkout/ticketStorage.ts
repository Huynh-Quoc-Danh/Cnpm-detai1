// Lưu trữ vé điện tử trên thiết bị (localStorage) – dùng chung cho EntitlementContext, CheckoutModal, PayPage.
// Một thiết bị có thể giữ NHIỀU vé (ví dụ mua vé lẻ cho điểm 2 rồi điểm 3): danh sách vé lưu ở
// 'hl_ticket_tokens' (mảng token) + 'hl_ticket_cache' (mảng vé). 'hl_ticket_token' giữ vé "chính"
// (bao phủ rộng nhất, hết hạn muộn nhất) để tương thích ngược.
import type { Order, Ticket } from '../../types';

export const TICKET_TOKEN_KEY = 'hl_ticket_token';
export const TICKET_TOKENS_KEY = 'hl_ticket_tokens';
export const TICKET_CACHE_KEY = 'hl_ticket_cache';
export const PENDING_ORDER_KEY = 'hl_pending_order';

// ---------- localStorage helpers (cũng dùng ở PayPage) ----------
export function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function lsSet(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function expMs(t: Ticket): number {
  const e = new Date(t.expiresAt).getTime();
  return isFinite(e) ? e : 0;
}

export function isTicketValid(t: Ticket | null | undefined, now = Date.now()): boolean {
  return !!t && expMs(t) > now;
}

/** Vé "chính": ưu tiên phạm vi toàn bộ, sau đó hết hạn muộn nhất. */
export function pickPrimary(list: Ticket[], now = Date.now()): Ticket | null {
  const valid = list.filter((t) => isTicketValid(t, now));
  if (!valid.length) return null;
  return [...valid].sort((a, b) => {
    const sa = a.scope === 'all' ? 1 : 0;
    const sb = b.scope === 'all' ? 1 : 0;
    if (sa !== sb) return sb - sa;
    return expMs(b) - expMs(a);
  })[0];
}

/** Tất cả vé đã lưu (kể cả vé hết hạn – sẽ được dọn khi xác minh). */
export function readStoredTickets(): Ticket[] {
  try {
    const raw = lsGet(TICKET_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const arr: Ticket[] = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
    return arr.filter((t) => t && typeof t.token === 'string');
  } catch {
    return [];
  }
}

function writeTickets(list: Ticket[]): void {
  if (!list.length) {
    lsSet(TICKET_TOKEN_KEY, null);
    lsSet(TICKET_TOKENS_KEY, null);
    lsSet(TICKET_CACHE_KEY, null);
    return;
  }
  const primary = pickPrimary(list) || list[list.length - 1];
  lsSet(TICKET_CACHE_KEY, JSON.stringify(list));
  lsSet(TICKET_TOKENS_KEY, JSON.stringify(list.map((t) => t.token)));
  lsSet(TICKET_TOKEN_KEY, primary.token);
}

export function setStoredTickets(list: Ticket[]): void {
  writeTickets(list);
}

export function getStoredTicketToken(): string | null {
  return lsGet(TICKET_TOKEN_KEY);
}

/**
 * Thêm (hoặc cập nhật) một vé vào danh sách trên thiết bị. KHÔNG thay thế các vé khác.
 * Truyền null để xoá toàn bộ vé (đăng xuất).
 */
export function storeTicket(ticket: Ticket | null): void {
  if (!ticket) {
    writeTickets([]);
    return;
  }
  const list = readStoredTickets().filter((t) => t.token !== ticket.token);
  list.push(ticket);
  writeTickets(list);
}

export function removeStoredTicket(token: string): void {
  writeTickets(readStoredTickets().filter((t) => t.token !== token));
}

export function readCachedTicket(token: string | null): Ticket | null {
  if (!token) return null;
  return readStoredTickets().find((t) => t.token === token) || null;
}

/** Ghi nhớ đơn đang chờ để tự mở khóa khi khách thanh toán trên điện thoại sau khi đóng cửa sổ. */
export function rememberPendingOrder(order: Pick<Order, 'id' | 'expiresAt'> | null): void {
  lsSet(PENDING_ORDER_KEY, order ? JSON.stringify({ id: order.id, expiresAt: order.expiresAt }) : null);
}
export function readPendingOrder(): { id: string; expiresAt: string } | null {
  try {
    const raw = lsGet(PENDING_ORDER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function ticketCovers(ticket: Ticket | null, siteId: number, now = Date.now()): boolean {
  if (!ticket) return false;
  const exp = new Date(ticket.expiresAt).getTime();
  if (!isFinite(exp) || exp <= now) return false;
  if (ticket.scope === 'all') return true;
  return (ticket.siteIds || []).map(Number).includes(Number(siteId));
}

/** Vé hợp lệ tốt nhất bao phủ điểm siteId (ưu tiên hết hạn muộn nhất). */
export function ticketFor(list: Ticket[], siteId: number, now = Date.now()): Ticket | null {
  const c = list.filter((t) => ticketCovers(t, siteId, now));
  if (!c.length) return null;
  return c.sort((a, b) => expMs(b) - expMs(a))[0];
}
