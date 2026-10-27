import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

interface ConfirmOpts {
  title: string;
  body?: string;
  confirm?: string;
  danger?: boolean;
}

interface UI {
  toast: (text: string, action?: Toast['action']) => void;
  confirm: (o: ConfirmOpts) => Promise<boolean>;
}

const Ctx = createContext<UI | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [dialog, setDialog] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const timer = useRef<number>();

  const showToast = useCallback<UI['toast']>((text, action) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), text, action });
    timer.current = window.setTimeout(() => setToast(null), action ? 4500 : 2200);
  }, []);

  const confirm = useCallback<UI['confirm']>((o) => new Promise((resolve) => setDialog({ ...o, resolve })), []);

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <Ctx.Provider value={{ toast: showToast, confirm }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+96px)]">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 500, damping: 34 }}
              className="pointer-events-auto flex max-w-sm items-center gap-4 rounded-2xl border border-line bg-raised/95 py-3 pl-4 pr-3 text-sm text-ink shadow-float backdrop-blur"
            >
              <span className="min-w-0 truncate">{toast.text}</span>
              {toast.action && (
                <button
                  className="shrink-0 rounded-lg px-2 py-1 font-semibold text-accent active:opacity-60"
                  onClick={() => {
                    toast.action!.run();
                    setToast(null);
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {dialog && (
          <motion.div className="fixed inset-0 z-[80] flex items-center justify-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => close(false)} />
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-label={dialog.title}
              initial={{ scale: 0.94, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="relative w-full max-w-xs rounded-3xl border border-line bg-card p-6 shadow-float"
            >
              <h2 className="text-lg font-semibold tracking-tight">{dialog.title}</h2>
              {dialog.body && <p className="mt-2 text-sm leading-relaxed text-muted">{dialog.body}</p>}
              <div className="mt-6 grid grid-cols-2 gap-2">
                <button className="btn-ghost" onClick={() => close(false)}>
                  Cancel
                </button>
                <button autoFocus className={dialog.danger ? 'btn-danger' : 'btn-primary'} onClick={() => close(true)}>
                  {dialog.confirm ?? 'OK'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

export function useUI() {
  const u = useContext(Ctx);
  if (!u) throw new Error('useUI outside provider');
  return u;
}
