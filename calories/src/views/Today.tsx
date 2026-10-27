import { AnimatePresence, motion } from 'framer-motion';
import { BookmarkPlus, ChevronLeft, ChevronRight, Copy, MoreHorizontal, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { MonthCalendar } from '../components/MonthCalendar';
import { Ring } from '../components/Ring';
import { Sheet } from '../components/Sheet';
import { Card, MacroBar, MacroLine } from '../components/ui';
import { addDays, dayLabel, longDate, todayKey } from '../lib/date';
import { entryTotal, fmt, qtyLabel, totalOf } from '../lib/nutrition';
import { useStore } from '../lib/store';
import { uid } from '../lib/storage';
import type { Entry, MealItem, Slot } from '../lib/types';
import { SLOTS, SLOT_LABEL } from '../lib/types';
import { useUI } from '../lib/ui';

interface Props {
  date: string;
  today: string;
  setDate: (k: string) => void;
  onAdd: (slot: Slot) => void;
  onEdit: (e: Entry) => void;
  onSaveMeal: (m: { name: string; items: MealItem[] }) => void;
}

export function Today({ date, today, setDate, onAdd, onEdit, onSaveMeal }: Props) {
  const { byDate, targetsOn } = useStore();
  const [calOpen, setCalOpen] = useState(false);
  const entries = byDate.get(date) ?? [];
  const total = totalOf(entries);
  const t = targetsOn(date);
  // Round once so "eaten" and "remaining" always add up to the target exactly.
  const eaten = Math.round(total.kcal);
  const remaining = t.kcal - eaten;
  const over = remaining < 0;
  const dir = useRef(0);

  const go = (n: number) => {
    dir.current = n;
    setDate(addDays(date, n));
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-2">
        <button className="icon-btn" aria-label="Previous day" onClick={() => go(-1)}>
          <ChevronLeft size={20} />
        </button>
        <button className="min-w-0 flex-1 text-center active:opacity-60" onClick={() => setCalOpen(true)}>
          <div className="text-[22px] font-semibold tracking-tight">{dayLabel(date, today)}</div>
          <div className="text-xs text-faint">{longDate(date)}</div>
        </button>
        <button className="icon-btn disabled:opacity-20" aria-label="Next day" disabled={date >= today} onClick={() => go(1)}>
          <ChevronRight size={20} />
        </button>
      </header>

      <AnimatePresence>
        {date !== today && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex justify-center">
            <button className="rounded-full bg-white/[0.07] px-3.5 py-1.5 text-xs font-medium text-muted active:bg-white/[0.12]" onClick={() => setDate(today)}>
              Back to today
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="px-5 pb-6 pt-7">
        <div className="flex justify-center">
          <Ring value={t.kcal ? eaten / t.kcal : 0} size={232} stroke={17} glow>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">{over ? 'Over' : 'Remaining'}</div>
            <AnimatedNumber value={Math.abs(remaining)} className={`mt-1 text-[52px] font-semibold leading-none tracking-[-0.03em] ${over ? 'text-over' : ''}`} />
            <div className="mt-2 text-xs text-muted">
              <AnimatedNumber value={eaten} /> of {fmt(t.kcal)} kcal
            </div>
          </Ring>
        </div>
        <div className="mt-7 grid grid-cols-3 gap-5">
          <MacroBar k="p" value={total.p} target={t.p} />
          <MacroBar k="c" value={total.c} target={t.c} />
          <MacroBar k="f" value={total.f} target={t.f} />
        </div>
      </Card>

      {SLOTS.map((slot) => (
        <MealCard
          key={slot}
          slot={slot}
          date={date}
          entries={entries.filter((e) => e.slot === slot)}
          onAdd={() => onAdd(slot)}
          onEdit={onEdit}
          onSaveMeal={onSaveMeal}
        />
      ))}

      <Sheet open={calOpen} onClose={() => setCalOpen(false)} title="Go to day">
        <div className="pb-2 pt-1">
          <MonthCalendar
            selected={date}
            onSelect={(k) => {
              setDate(k);
              setCalOpen(false);
            }}
          />
        </div>
      </Sheet>
    </div>
  );
}

function MealCard({
  slot,
  date,
  entries,
  onAdd,
  onEdit,
  onSaveMeal,
}: {
  slot: Slot;
  date: string;
  entries: Entry[];
  onAdd: () => void;
  onEdit: (e: Entry) => void;
  onSaveMeal: Props['onSaveMeal'];
}) {
  const { byDate, addEntries, deleteEntry } = useStore();
  const { toast } = useUI();
  const [menu, setMenu] = useState(false);
  const total = totalOf(entries);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [menu]);

  // Most recent earlier day that has something in this slot.
  const previous = () => {
    for (let i = 1; i <= 14; i++) {
      const k = addDays(date, -i);
      const list = (byDate.get(k) ?? []).filter((e) => e.slot === slot);
      if (list.length) return { k, list };
    }
    return null;
  };

  const copyPrevious = () => {
    setMenu(false);
    const prev = previous();
    if (!prev) return toast(`No recent ${SLOT_LABEL[slot].toLowerCase()} to copy`);
    const now = Date.now();
    const copies = prev.list.map((e, i) => ({ ...e, id: uid(), date, at: now + i }));
    addEntries(copies);
    const ids = new Set(copies.map((c) => c.id));
    toast(`Copied ${SLOT_LABEL[slot].toLowerCase()} from ${dayLabel(prev.k, todayKey()).toLowerCase()}`, {
      label: 'Undo',
      run: () => ids.forEach((id) => deleteEntry(id)),
    });
  };

  return (
    <Card className="overflow-visible">
      <div className="flex items-center gap-2 py-3 pl-5 pr-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold tracking-tight">{SLOT_LABEL[slot]}</h2>
          {entries.length > 0 && <MacroLine p={total.p} c={total.c} f={total.f} className="mt-0.5" />}
        </div>
        {entries.length > 0 && (
          <span className="tnum text-[15px] font-semibold">
            <AnimatedNumber value={total.kcal} />
            <span className="ml-0.5 text-xs font-normal text-faint"> kcal</span>
          </span>
        )}
        <div className="relative" ref={menuRef}>
          <button className="icon-btn text-faint" aria-label={`${SLOT_LABEL[slot]} options`} aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
            <MoreHorizontal size={18} />
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-10 z-20 w-56 origin-top-right overflow-hidden rounded-2xl border border-line bg-raised py-1 shadow-float"
              >
                <button className="menu-item" onClick={copyPrevious}>
                  <Copy size={15} /> Copy from previous day
                </button>
                <button
                  className="menu-item disabled:opacity-40"
                  disabled={!entries.length}
                  onClick={() => {
                    setMenu(false);
                    onSaveMeal({ name: '', items: entries.map((e) => ({ name: e.name, unit: e.unit, qty: e.qty, per: e.per })) });
                  }}
                >
                  <BookmarkPlus size={15} /> Save as custom meal
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.07] active:scale-90 active:bg-white/[0.12]" aria-label={`Add to ${SLOT_LABEL[slot]}`} onClick={onAdd}>
          <Plus size={18} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {entries.length > 0 && (
          <motion.ul initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-line">
            <AnimatePresence initial={false}>
              {entries.map((e) => (
                <motion.li
                  key={e.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <button className="flex w-full items-center gap-3 px-5 py-3 text-left active:bg-white/[0.03]" onClick={() => onEdit(e)}>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px]">{e.name}</div>
                      <div className="truncate text-xs text-faint">{qtyLabel(e.qty, e.unit) || (e.per.p + e.per.c + e.per.f ? '' : 'calories only')}</div>
                    </div>
                    <span className="tnum shrink-0 text-sm text-muted">{fmt(entryTotal(e).kcal)}</span>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </AnimatePresence>
    </Card>
  );
}
