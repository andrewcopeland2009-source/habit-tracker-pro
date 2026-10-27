import { motion } from 'framer-motion';
import { BarChart3, BookOpen, CircleDot, Plus, Settings2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { todayKey } from './lib/date';
import { slotForNow } from './lib/nutrition';
import { requestPersistence } from './lib/storage';
import type { Entry, Food, Meal, Slot } from './lib/types';
import { AddSheet } from './sheets/AddSheet';
import { EditEntrySheet } from './sheets/EditEntrySheet';
import { FoodSheet } from './sheets/FoodSheet';
import { MealSheet, type MealTarget } from './sheets/MealSheet';
import { Library } from './views/Library';
import { Progress } from './views/Progress';
import { Settings } from './views/Settings';
import { Today } from './views/Today';

type Tab = 'today' | 'progress' | 'library' | 'settings';

/** Keeps "today" correct across midnight and when the app is resumed from the background. */
function useToday() {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const check = () => setToday(todayKey());
    const id = window.setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);
  return today;
}

export default function App() {
  const today = useToday();
  const [tab, setTab] = useState<Tab>('today');
  const [date, setDate] = useState(today);
  const [add, setAdd] = useState<{ open: boolean; slot: Slot }>({ open: false, slot: slotForNow() });
  const [editing, setEditing] = useState<Entry | null>(null);
  const [food, setFood] = useState<Food | 'new' | null>(null);
  const [meal, setMeal] = useState<MealTarget>(null);
  const prevToday = useRef(today);

  // If the day rolls over while viewing "today", follow it.
  useEffect(() => {
    if (date === prevToday.current) setDate(today);
    prevToday.current = today;
  }, [today]);

  useEffect(() => {
    requestPersistence();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  const openAdd = useCallback((slot: Slot) => setAdd({ open: true, slot }), []);
  const closeAdd = useCallback(() => setAdd((a) => ({ ...a, open: false })), []);
  const closeEdit = useCallback(() => setEditing(null), []);
  const closeFood = useCallback(() => setFood(null), []);
  const closeMeal = useCallback(() => setMeal(null), []);

  const fab = () => {
    if (tab !== 'today') {
      setTab('today');
      setDate(today);
    }
    openAdd(tab === 'today' && date !== today ? 'snack' : slotForNow());
  };

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg px-4 pb-[calc(env(safe-area-inset-bottom)+112px)] pt-[calc(env(safe-area-inset-top)+8px)]">
      {/* Enter-only transition: switching tabs is instant, the new view just eases in. */}
      <motion.main key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
          {tab === 'today' && <Today date={date} today={today} setDate={setDate} onAdd={openAdd} onEdit={setEditing} onSaveMeal={setMeal} />}
          {tab === 'progress' && (
            <Progress
              today={today}
              openDay={(k) => {
                setDate(k);
                setTab('today');
              }}
            />
          )}
          {tab === 'library' && <Library onFood={setFood} onMeal={(m: Meal | 'new') => setMeal(m)} />}
          {tab === 'settings' && <Settings today={today} />}
      </motion.main>

      <Nav tab={tab} setTab={setTab} onAdd={fab} />

      <AddSheet open={add.open} onClose={closeAdd} date={tab === 'today' ? date : today} slot={add.slot} />
      <EditEntrySheet entry={editing} onClose={closeEdit} />
      <FoodSheet food={food} onClose={closeFood} />
      <MealSheet meal={meal} onClose={closeMeal} />
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: typeof CircleDot }[] = [
  { id: 'today', label: 'Today', icon: CircleDot },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'library', label: 'Library', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

function Nav({ tab, setTab, onAdd }: { tab: Tab; setTab: (t: Tab) => void; onAdd: () => void }) {
  const item = (t: (typeof TABS)[number]) => {
    const Icon = t.icon;
    const on = tab === t.id;
    return (
      <button key={t.id} onClick={() => setTab(t.id)} className={`relative flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${on ? 'text-ink' : 'text-faint active:text-muted'}`} aria-current={on ? 'page' : undefined}>
        <Icon size={21} strokeWidth={on ? 2.2 : 1.8} />
        {t.label}
        {on && <motion.span layoutId="nav-dot" className="absolute -top-px h-[2px] w-5 rounded-full bg-accent" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
      </button>
    );
  };
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center px-2">
        {TABS.slice(0, 2).map(item)}
        <div className="flex flex-1 justify-center">
          <motion.button whileTap={{ scale: 0.9 }} onClick={onAdd} aria-label="Log food" className="-mt-5 grid h-14 w-14 place-items-center rounded-full bg-accent text-black shadow-[0_8px_24px_-6px_rgb(var(--accent)/0.55)]">
            <Plus size={26} strokeWidth={2.4} />
          </motion.button>
        </div>
        {TABS.slice(2).map(item)}
      </div>
    </nav>
  );
}
