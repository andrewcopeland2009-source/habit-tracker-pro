import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/AppStore';

export function Panel({ children, className = '', ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section className={`panel ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function SectionHeader({ title, kicker, action }: { title: string; kicker?: string; action?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-end justify-between gap-2">
      <div className="min-w-0">
        {kicker && <div className="label-xs">{kicker}</div>}
        <h2 className="truncate font-serif text-[17px] font-semibold leading-tight text-ink">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ kicker, title, right, children }: { kicker?: string; title: string; right?: ReactNode; children?: ReactNode }) {
  return (
    <header className="relative px-4 pb-3 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {kicker && <div className="label-xs mb-0.5">{kicker}</div>}
          <h1 className="font-serif text-[28px] font-semibold leading-[1.1] tracking-tight text-ink">{title}</h1>
        </div>
        {right && <div className="flex shrink-0 items-center gap-1.5 pt-1">{right}</div>}
      </div>
      {children}
    </header>
  );
}

export function IconButton({ label, children, onClick, className = '' }: { label: string; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-full border border-line bg-card text-muted shadow-soft transition hover:text-ink active:scale-95 ${className}`}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className = '' }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
}) {
  const id = useId();
  return (
    <div role="tablist" className={`relative flex rounded-xl border border-line bg-sunk p-0.5 ${className}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(o.value)}
            className={`relative z-10 flex-1 rounded-[10px] px-2.5 py-1.5 text-xs font-semibold transition-colors ${active ? 'text-ink' : 'text-muted'}`}
          >
            {active && (
              <motion.span layoutId={`seg-${id}`} className="absolute inset-0 -z-10 rounded-[10px] bg-card shadow-soft" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-faint">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors ${checked ? 'bg-sage' : 'bg-line'}`}
    >
      <motion.span
        className="absolute top-[3px] h-5 w-5 rounded-full bg-card shadow-soft"
        animate={{ left: checked ? 21 : 3 }}
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
      />
    </button>
  );
}

/** Bottom sheet on phones, centered dialog on wider screens. */
export function Sheet({ open, onClose, title, children, footer }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.focus(), 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-[#2a2220]/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-line bg-card shadow-lift focus:outline-none sm:rounded-[28px]"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line sm:hidden" />
            <div className="flex items-center justify-between px-5 pb-2 pt-3">
              <h2 className="font-serif text-xl font-semibold">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full bg-sunk text-muted hover:text-ink">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
            {footer && <div className="border-t border-line bg-card px-5 pb-[calc(14px+var(--safe-bottom))] pt-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Confirm({ open, title, message, confirmLabel = 'Delete', onConfirm, onClose }: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-2">
          <button type="button" className="btn-soft flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger flex-1"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="text-sm leading-relaxed text-muted">{message}</div>
    </Sheet>
  );
}

export function EmptyState({ art, title, message, action }: { art?: ReactNode; title: string; message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      {art}
      <h3 className="mt-3 font-serif text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-[280px] text-sm leading-relaxed text-muted">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+10px)] z-[60] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className={`pointer-events-auto max-w-sm rounded-2xl border px-4 py-2.5 text-sm font-medium shadow-lift ${
              t.tone === 'error' ? 'border-coral/60 bg-coral/30 text-ink' : t.tone === 'success' ? 'border-sage bg-card text-ink' : 'border-line bg-card text-ink'
            }`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Stat({ label, value, sub, tint }: { label: string; value: ReactNode; sub?: ReactNode; tint?: string }) {
  return (
    <div className="min-w-0 rounded-xl px-2.5 py-2" style={{ background: tint }}>
      <div className="label-xs truncate !text-[9px]">{label}</div>
      <div className="tabular mt-0.5 truncate font-serif text-lg font-semibold leading-tight">{value}</div>
      {sub && <div className="truncate text-[10px] text-muted">{sub}</div>}
    </div>
  );
}

export function ProgressBar({ value, color, height = 6, className = '' }: { value: number; color: string; height?: number; className?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className={`overflow-hidden rounded-full bg-sunk ${className}`} style={{ height }} role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }} />
    </div>
  );
}
