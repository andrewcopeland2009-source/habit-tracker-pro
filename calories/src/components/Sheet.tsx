import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  left?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  tall?: boolean;
}

/** Bottom sheet on phones, centered panel on larger screens. Drag the header down to dismiss. */
export function Sheet({ open, onClose, title, left, children, footer, tall }: Props) {
  const drag = useDragControls();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={`relative flex w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-b-0 border-line bg-card shadow-float sm:rounded-[28px] sm:border-b ${
              tall ? 'h-[92dvh] sm:h-[min(760px,88dvh)]' : 'max-h-[92dvh] sm:max-h-[88dvh]'
            }`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40, mass: 0.8 }}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            <div className="shrink-0 cursor-grab touch-none select-none px-5 pt-2.5 active:cursor-grabbing" onPointerDown={(e) => drag.start(e)}>
              <div className="mx-auto h-1 w-9 rounded-full bg-white/15" />
              <div className="flex min-h-[48px] items-center gap-2 pt-1.5">
                <div className="flex min-w-[36px] items-center">{left}</div>
                <div className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold tracking-tight">{title}</div>
                <div className="flex min-w-[36px] justify-end">
                  <button aria-label="Close" className="icon-btn" onPointerDown={(e) => e.stopPropagation()} onClick={onClose}>
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
            {footer && <div className="shrink-0 border-t border-line bg-card px-5 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3">{footer}</div>}
            {!footer && <div className="shrink-0 pb-[env(safe-area-inset-bottom)]" />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
