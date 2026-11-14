// Ngăn xếp lớp phủ dùng chung (khách + quản trị):
//  - phím Esc chỉ đóng lớp TRÊN CÙNG,
//  - khoá cuộn trang có đếm tham chiếu (chỉ mở lại khi lớp cuối cùng đóng).
import { useEffect, useRef } from 'react';

const overlayStack: number[] = [];
let overlaySeq = 0;
let lockCount = 0;
let savedOverflow = '';

export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => undefined;
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) document.body.style.overflow = savedOverflow === 'hidden' ? '' : savedOverflow;
  };
}

export interface OverlayOptions {
  /** Khoá cuộn trang khi mở (mặc định true). */
  lockScroll?: boolean;
  /** Trả về false để bỏ qua phím Esc (vd. đang ở màn hình thanh toán). */
  canEscape?: () => boolean;
}

export function useOverlay(open: boolean, onClose: () => void, opts: OverlayOptions = {}): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const canEscRef = useRef(opts.canEscape);
  canEscRef.current = opts.canEscape;
  const lock = opts.lockScroll !== false;

  useEffect(() => {
    if (!open) return;
    const id = ++overlaySeq;
    overlayStack.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || overlayStack[overlayStack.length - 1] !== id) return;
      e.stopPropagation();
      if (canEscRef.current && !canEscRef.current()) return;
      closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    const release = lock ? lockBodyScroll() : () => undefined;
    return () => {
      window.removeEventListener('keydown', onKey);
      const i = overlayStack.indexOf(id);
      if (i >= 0) overlayStack.splice(i, 1);
      release();
    };
  }, [open, lock]);
}

/** True khi đang có ít nhất một lớp phủ mở. */
export function hasOpenOverlay(): boolean {
  return overlayStack.length > 0;
}
