import { motion } from 'framer-motion';
import { BarChart3, BookHeart, CalendarDays, Sun, Target } from 'lucide-react';
import type { Tab } from '../store/ui';

const TABS: { id: Tab; label: string; Icon: typeof Sun }[] = [
  { id: 'today', label: 'Today', Icon: Sun },
  { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { id: 'insights', label: 'Insights', Icon: BarChart3 },
  { id: 'journal', label: 'Journal', Icon: BookHeart },
  { id: 'goals', label: 'Goals', Icon: Target },
];

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line/80 bg-card/85 backdrop-blur-xl"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="mx-auto flex h-[var(--nav-h)] max-w-xl items-stretch px-2">
        {TABS.map(({ id, label, Icon }) => {
          const active = id === tab;
          return (
            <button
              key={id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onChange(id)}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5"
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute top-1.5 h-8 w-14 rounded-full bg-blush/45"
                  transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                />
              )}
              <motion.span animate={{ y: active ? -1 : 0, scale: active ? 1.06 : 1 }} className="relative z-10 grid h-8 place-items-center">
                <Icon size={21} strokeWidth={active ? 2.2 : 1.8} className={active ? 'text-ink' : 'text-muted'} />
              </motion.span>
              <span className={`relative z-10 text-[10px] font-semibold tracking-wide ${active ? 'text-ink' : 'text-muted'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
