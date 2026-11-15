import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './ui';

interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'primary';
  icon?: string;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Hộp thoại xác nhận (thay cho window.confirm). Dùng: const confirm = useConfirm(); if (await confirm({...})) ... */
export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(v: boolean) => void>();

  const confirm = useCallback<ConfirmFn>((opts) => {
    setState(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((v: boolean) => {
    resolver.current?.(v);
    resolver.current = undefined;
    setState(null);
  }, []);

  const danger = (state?.tone || 'danger') === 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        size="sm"
        nested
        title={
          <span className="flex items-center gap-3">
            <span
              className={
                'w-10 h-10 rounded-2xl flex items-center justify-center ' +
                (danger ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-sky-600')
              }
            >
              <i className={'fa-solid ' + (state?.icon || (danger ? 'fa-triangle-exclamation' : 'fa-circle-question'))}></i>
            </span>
            {state?.title}
          </span>
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              {state?.cancelText || 'Hủy bỏ'}
            </Button>
            <Button variant={danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
              {state?.confirmText || 'Xác nhận'}
            </Button>
          </>
        }
      >
        <div className="text-sm text-slate-600 leading-relaxed">{state?.message}</div>
      </Modal>
    </ConfirmContext.Provider>
  );
};

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
}
