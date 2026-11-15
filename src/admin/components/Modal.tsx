import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../utils';

// Ngăn xếp lớp phủ dùng chung: phím Esc chỉ đóng lớp trên cùng, khoá cuộn có đếm tham chiếu.
import { useOverlay } from '../../hooks/useOverlay';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** z-index cao hơn khi lồng trong drawer */
  nested?: boolean;
}

const SIZE = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, subtitle, icon, size = 'md', footer, children, nested }) => {
  useOverlay(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className={cx('fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6', nested ? 'z-[1600]' : 'z-[1400]')}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-[adminFade_.15s_ease-out]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          'relative w-full bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-slate-900/20 flex flex-col max-h-[92vh] animate-[adminPop_.2s_ease-out]',
          SIZE[size]
        )}
      >
        <div className="flex items-start gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100">
          {icon && (
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-sky-50 to-teal-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <i className={cx('fa-solid', icon)}></i>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">{title}</h3>
            {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition" aria-label="Đóng">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="px-5 sm:px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-3xl flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerExtra?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({ open, onClose, title, subtitle, headerExtra, footer, children, width = 'max-w-3xl' }) => {
  useOverlay(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[1300] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-[adminFade_.15s_ease-out]" onClick={onClose} />
      <aside className={cx('relative w-full h-full bg-slate-50 shadow-2xl flex flex-col animate-[adminSlideIn_.25s_ease-out]', width)}>
        <div className="bg-white border-b border-slate-200 px-5 sm:px-6 pt-5">
          <div className="flex items-start gap-3 pb-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-extrabold text-slate-900 truncate">{title}</h3>
              {subtitle && <p className="text-sm text-slate-500 mt-0.5 truncate">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition" aria-label="Đóng">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          {headerExtra}
        </div>
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">{children}</div>
        {footer && <div className="bg-white border-t border-slate-200 px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-end gap-2">{footer}</div>}
      </aside>
    </div>,
    document.body
  );
};
