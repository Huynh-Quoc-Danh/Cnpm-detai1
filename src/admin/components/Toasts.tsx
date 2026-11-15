import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { cx } from '../utils';

type ToastKind = 'success' | 'error' | 'info' | 'warning';
interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastApi {
  show: (kind: ToastKind, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const KIND_STYLE: Record<ToastKind, { icon: string; ring: string; iconBg: string }> = {
  success: { icon: 'fa-circle-check', ring: 'border-emerald-200', iconBg: 'bg-emerald-50 text-emerald-600' },
  error: { icon: 'fa-circle-exclamation', ring: 'border-rose-200', iconBg: 'bg-rose-50 text-rose-600' },
  warning: { icon: 'fa-triangle-exclamation', ring: 'border-amber-200', iconBg: 'bg-amber-50 text-amber-600' },
  info: { icon: 'fa-circle-info', ring: 'border-sky-200', iconBg: 'bg-sky-50 text-sky-600' }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (kind: ToastKind, title: string, message?: string) => {
      const id = nextId.current++;
      setItems((l) => [...l.filter((t) => !(t.title === title && t.message === message)), { id, kind, title, message }].slice(-4));
      window.setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3800);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (t, m) => show('success', t, m),
      error: (t, m) => show('error', t, m),
      info: (t, m) => show('info', t, m),
      warning: (t, m) => show('warning', t, m)
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed z-[2000] bottom-4 right-4 left-4 sm:left-auto sm:w-96 flex flex-col gap-2 pointer-events-none print:hidden">
        {items.map((t) => {
          const s = KIND_STYLE[t.kind];
          return (
            <div
              key={t.id}
              role="status"
              className={cx(
                'pointer-events-auto flex items-start gap-3 bg-white/95 backdrop-blur border rounded-2xl shadow-lg shadow-slate-900/10 p-3.5 animate-[adminToastIn_.25s_ease-out]',
                s.ring
              )}
            >
              <div className={cx('w-9 h-9 shrink-0 rounded-xl flex items-center justify-center', s.iconBg)}>
                <i className={cx('fa-solid', s.icon)}></i>
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-bold text-slate-900">{t.title}</p>
                {t.message && <p className="text-xs text-slate-500 mt-0.5 break-words">{t.message}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                aria-label="Đóng"
              >
                <i className="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
