import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, Plus, Search, Star, Utensils, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Sheet } from '../components/Sheet';
import { MacroLine, Segmented } from '../components/ui';
import { dayLabel, todayKey } from '../lib/date';
import { fmt, mealPer, num, qtyLabel, rank } from '../lib/nutrition';
import { useStore } from '../lib/store';
import type { Food, Meal, Slot } from '../lib/types';
import { SLOTS, SLOT_LABEL } from '../lib/types';
import { useUI } from '../lib/ui';
import { blankDraft, finalize, FoodForm, type FoodDraft } from './FoodForm';
import { Portion } from './Portion';

type Step = { kind: 'search' } | { kind: 'food'; food: Food } | { kind: 'meal'; meal: Meal } | { kind: 'new' };

const slotOptions = SLOTS.map((s) => ({ value: s, label: SLOT_LABEL[s] }));

export function AddSheet({ open, onClose, date, slot: initialSlot }: { open: boolean; onClose: () => void; date: string; slot: Slot }) {
  const { data, addEntry, logMeal, deleteEntry, toggleFoodFav, toggleMealFav } = useStore();
  const { toast } = useUI();
  const [slot, setSlot] = useState<Slot>(initialSlot);
  const [q, setQ] = useState('');
  const [step, setStep] = useState<Step>({ kind: 'search' });
  const [qty, setQty] = useState(1);
  const [draft, setDraft] = useState<FoodDraft>(blankDraft());
  const [remember, setRemember] = useState(true);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSlot(initialSlot);
      setQ('');
      setStep({ kind: 'search' });
    }
  }, [open, initialSlot]);

  const query = q.trim().toLowerCase();
  const foods = useMemo(() => rank(data.foods).filter((f) => !query || f.name.toLowerCase().includes(query)), [data.foods, query]);
  const meals = useMemo(() => rank(data.meals).filter((m) => !query || m.name.toLowerCase().includes(query)), [data.meals, query]);
  const quickKcal = /^\d+([.,]\d+)?$/.test(query) ? num(query) : 0;

  const added = (name: string, id: string, key: string) => {
    setJustAdded(key);
    setTimeout(() => setJustAdded((k) => (k === key ? null : k)), 900);
    toast(`${name} added to ${SLOT_LABEL[slot].toLowerCase()}`, { label: 'Undo', run: () => deleteEntry(id) });
  };

  const addFood = (f: Food, quantity = 1) => {
    const e = addEntry({ date, slot, name: f.name, unit: f.unit, qty: quantity, per: f.per });
    added(f.name, e.id, f.id);
  };

  const addMeal = (m: Meal, quantity = 1) => {
    const e = logMeal(m, date, slot, quantity);
    added(m.name, e.id, m.id);
  };

  const back = () => setStep({ kind: 'search' });

  const openFood = (food: Food) => {
    setQty(1);
    setStep({ kind: 'food', food });
  };
  const openMeal = (meal: Meal) => {
    setQty(1);
    setStep({ kind: 'meal', meal });
  };
  const openNew = () => {
    setDraft(blankDraft(quickKcal ? '' : q.trim()));
    if (quickKcal) setDraft((d) => ({ ...d, per: { ...d.per, kcal: quickKcal } }));
    setQty(1);
    setRemember(true);
    setStep({ kind: 'new' });
  };

  const quickAdd = () => {
    const e = addEntry({ date, slot, name: 'Quick add', unit: '', qty: 1, per: { kcal: quickKcal, p: 0, c: 0, f: 0 } }, false);
    setQ('');
    added(`${fmt(quickKcal)} kcal`, e.id, 'quick');
  };

  const saveNew = () => {
    const d = finalize(draft);
    const e = addEntry({ date, slot, name: d.name || 'Food', unit: d.unit, qty, per: d.per }, remember && !!d.name);
    toast(`${d.name || 'Food'} added`, { label: 'Undo', run: () => deleteEntry(e.id) });
    onClose();
  };

  const title =
    step.kind === 'search' ? (
      <span>
        Add food{date !== todayKey() && <span className="ml-1.5 font-normal text-faint">· {dayLabel(date)}</span>}
      </span>
    ) : step.kind === 'new' ? (
      'New food'
    ) : step.kind === 'food' ? (
      step.food.name
    ) : (
      step.meal.name
    );

  const left =
    step.kind !== 'search' ? (
      <button aria-label="Back" className="icon-btn" onPointerDown={(e) => e.stopPropagation()} onClick={back}>
        <ChevronLeft size={20} />
      </button>
    ) : undefined;

  const footer =
    step.kind === 'food' ? (
      <button
        className="btn-primary w-full"
        onClick={() => {
          addFood(step.food, qty);
          onClose();
        }}
      >
        Add to {SLOT_LABEL[slot]}
      </button>
    ) : step.kind === 'meal' ? (
      <button
        className="btn-primary w-full"
        onClick={() => {
          addMeal(step.meal, qty);
          onClose();
        }}
      >
        Add to {SLOT_LABEL[slot]}
      </button>
    ) : step.kind === 'new' ? (
      <button className="btn-primary w-full" disabled={!draft.name.trim() && !draft.per.kcal} onClick={saveNew}>
        Add to {SLOT_LABEL[slot]}
      </button>
    ) : (
      <button className="btn-ghost w-full" onClick={onClose}>
        Done
      </button>
    );

  return (
    <Sheet open={open} onClose={onClose} title={title} left={left} footer={footer} tall>
      <div className="sticky top-0 z-10 -mx-5 bg-card px-5 pb-3 pt-1">
        <Segmented size="sm" value={slot} options={slotOptions} onChange={setSlot} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step.kind}
          initial={{ opacity: 0, x: step.kind === 'search' ? -12 : 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: step.kind === 'search' ? -12 : 12 }}
          transition={{ duration: 0.16 }}
        >
          {step.kind === 'search' && (
            <div>
              <div className="relative">
                <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  className="input pl-10"
                  placeholder="Search saved foods, or type calories"
                  value={q}
                  autoFocus={matchMedia('(hover: hover)').matches}
                  enterKeyHint="go"
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    if (quickKcal) quickAdd();
                    else if (meals[0] || foods[0]) (meals[0] ? openMeal(meals[0]) : openFood(foods[0]));
                    else openNew();
                  }}
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {quickKcal > 0 && (
                  <button className="tile col-span-2 border-accent/30 bg-accent/10 text-accent" onClick={quickAdd}>
                    <Zap size={16} />
                    Quick add {fmt(quickKcal)} kcal
                  </button>
                )}
                <button className="tile col-span-2" onClick={openNew}>
                  <Plus size={16} />
                  {query && !quickKcal ? `Create “${q.trim()}”` : 'New food'}
                </button>
              </div>

              {meals.length > 0 && (
                <List title="Meals">
                  {meals.map((m) => {
                    const per = mealPer(m.items);
                    return (
                      <Row
                        key={m.id}
                        name={m.name}
                        sub={`${m.items.length} item${m.items.length === 1 ? '' : 's'}`}
                        kcal={per.kcal}
                        macros={per}
                        fav={m.fav}
                        icon
                        done={justAdded === m.id}
                        onOpen={() => openMeal(m)}
                        onAdd={() => addMeal(m)}
                        onFav={() => toggleMealFav(m.id)}
                      />
                    );
                  })}
                </List>
              )}

              {foods.length > 0 && (
                <List title={query ? 'Foods' : 'Frequent'}>
                  {foods.slice(0, 60).map((f) => (
                    <Row
                      key={f.id}
                      name={f.name}
                      sub={f.unit}
                      kcal={f.per.kcal}
                      macros={f.per}
                      fav={f.fav}
                      done={justAdded === f.id}
                      onOpen={() => openFood(f)}
                      onAdd={() => addFood(f)}
                      onFav={() => toggleFoodFav(f.id)}
                    />
                  ))}
                </List>
              )}

              {data.foods.length === 0 && data.meals.length === 0 && (
                <p className="mx-auto mt-10 max-w-[16rem] text-center text-sm leading-relaxed text-faint">
                  Foods you log are remembered here, so next time it’s a single tap.
                </p>
              )}
              {(data.foods.length > 0 || data.meals.length > 0) && foods.length === 0 && meals.length === 0 && !quickKcal && (
                <p className="mt-8 text-center text-sm text-faint">No saved food matches “{q.trim()}”.</p>
              )}
            </div>
          )}

          {step.kind === 'food' && (
            <div className="pt-2">
              <Portion unit={step.food.unit} per={step.food.per} qty={qty} onChange={setQty} />
            </div>
          )}

          {step.kind === 'meal' && (
            <div className="pt-2">
              <Portion unit="" per={mealPer(step.meal.items)} qty={qty} onChange={setQty} />
              <ul className="mt-5 divide-y divide-line rounded-2xl bg-raised px-4">
                {step.meal.items.map((it, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0 truncate">
                      {it.name} <span className="text-faint">{qtyLabel(it.qty, it.unit)}</span>
                    </span>
                    <span className="tnum shrink-0 text-muted">{fmt(it.per.kcal * it.qty * qty)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step.kind === 'new' && (
            <div className="space-y-5 pt-2">
              <FoodForm draft={draft} onChange={setDraft} autoFocus={!draft.name} />
              <Portion unit={draft.unit} per={finalize(draft).per} qty={qty} onChange={setQty} />
              <label className="flex items-center justify-between rounded-2xl bg-raised px-4 py-3 text-sm">
                <span>
                  Save to my foods
                  <span className="block text-xs text-faint">One tap to log it next time</span>
                </span>
                <input type="checkbox" className="toggle" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              </label>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Sheet>
  );
}

function List({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">{title}</div>
      <ul className="divide-y divide-line">{children}</ul>
    </div>
  );
}

function Row(props: {
  name: string;
  sub: string;
  kcal: number;
  macros: { p: number; c: number; f: number };
  fav: boolean;
  icon?: boolean;
  done: boolean;
  onOpen: () => void;
  onAdd: () => void;
  onFav: () => void;
}) {
  return (
    <li className="flex items-center gap-2">
      <button className="-ml-1 p-1.5 text-faint active:scale-90" aria-label={props.fav ? 'Unpin' : 'Pin'} onClick={props.onFav}>
        <Star size={15} className={props.fav ? 'fill-carbs text-carbs' : ''} />
      </button>
      <button className="min-w-0 flex-1 py-3 text-left active:opacity-60" onClick={props.onOpen}>
        <div className="flex items-center gap-1.5 truncate text-[15px] font-medium">
          {props.icon && <Utensils size={13} className="shrink-0 text-faint" />}
          <span className="truncate">{props.name}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 truncate text-xs text-faint">
          {props.sub && <span className="truncate">{props.sub}</span>}
          <MacroLine {...props.macros} />
        </div>
      </button>
      <span className="tnum shrink-0 text-sm text-muted">{fmt(props.kcal)}</span>
      <button
        aria-label={`Add ${props.name}`}
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors duration-200 active:scale-90 ${
          props.done ? 'bg-accent text-black' : 'bg-white/[0.07] text-ink'
        }`}
        onClick={props.onAdd}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={props.done ? 'y' : 'n'} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.14 }}>
            {props.done ? <Check size={17} strokeWidth={2.6} /> : <Plus size={17} />}
          </motion.span>
        </AnimatePresence>
      </button>
    </li>
  );
}
