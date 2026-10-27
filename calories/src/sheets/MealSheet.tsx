import { ChevronLeft, Minus, Plus, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { Sheet } from '../components/Sheet';
import { MacroLine, NumberInput } from '../components/ui';
import { fmt, mealPer, parseAmount, qtyLabel, rank } from '../lib/nutrition';
import { useStore } from '../lib/store';
import type { Meal, MealItem } from '../lib/types';
import { useUI } from '../lib/ui';
import { blankDraft, finalize, FoodForm, type FoodDraft } from './FoodForm';

export type MealTarget = Meal | { name: string; items: MealItem[] } | 'new' | null;

export function MealSheet({ meal, onClose }: { meal: MealTarget; onClose: () => void }) {
  const { data, saveMeal, deleteMeal } = useStore();
  const { confirm, toast } = useUI();
  const [name, setName] = useState('');
  const [items, setItems] = useState<MealItem[]>([]);
  const [step, setStep] = useState<'main' | 'pick' | 'new'>('main');
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState<FoodDraft>(blankDraft());
  const editing = meal && meal !== 'new' && 'id' in meal ? meal : null;

  useEffect(() => {
    if (!meal) return;
    setStep('main');
    if (meal === 'new') {
      setName('');
      setItems([]);
    } else {
      setName(meal.name);
      setItems(meal.items.map((i) => ({ ...i })));
    }
  }, [meal]);

  const total = mealPer(items);
  const foods = useMemo(() => rank(data.foods).filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase())), [data.foods, q]);

  const setQty = (i: number, qty: number) => setItems((list) => list.map((it, j) => (j === i ? { ...it, qty: Math.max(0.25, qty) } : it)));
  const addItem = (it: MealItem) => {
    setItems((list) => [...list, it]);
    setStep('main');
    setQ('');
  };

  const save = () => {
    saveMeal({ ...(editing ?? {}), name: name.trim(), items });
    toast(editing ? 'Meal updated' : `Saved “${name.trim()}”`);
    onClose();
  };

  const remove = async () => {
    if (!editing) return;
    if (await confirm({ title: `Delete ${editing.name}?`, body: 'Past entries stay as they are.', confirm: 'Delete', danger: true })) {
      deleteMeal(editing.id);
      onClose();
    }
  };

  const stop = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <Sheet
      open={!!meal}
      onClose={onClose}
      tall
      title={step === 'pick' ? 'Add item' : step === 'new' ? 'New item' : editing ? 'Edit meal' : 'New meal'}
      left={
        step !== 'main' ? (
          <button aria-label="Back" className="icon-btn" onPointerDown={stop} onClick={() => setStep('main')}>
            <ChevronLeft size={20} />
          </button>
        ) : editing ? (
          <button aria-label="Delete meal" className="icon-btn text-over" onPointerDown={stop} onClick={remove}>
            <Trash2 size={17} />
          </button>
        ) : undefined
      }
      footer={
        step === 'main' ? (
          <button className="btn-primary w-full" disabled={!name.trim() || items.length === 0} onClick={save}>
            Save meal
          </button>
        ) : step === 'new' ? (
          <button
            className="btn-primary w-full"
            disabled={!draft.name.trim()}
            onClick={() => {
              const d = finalize(draft);
              addItem({ name: d.name, unit: d.unit, qty: 1, per: d.per });
            }}
          >
            Add item
          </button>
        ) : undefined
      }
    >
      {step === 'main' && (
        <div className="space-y-5 pt-1">
          <input className="input text-base font-medium" placeholder="Meal name, e.g. Usual breakfast" value={name} onChange={(e) => setName(e.target.value)} autoFocus={meal === 'new'} />

          <div className="rounded-2xl bg-raised p-4">
            <div className="flex items-end justify-between">
              <span className="text-xs font-medium text-muted">Total</span>
              <span className="text-2xl font-semibold tracking-tight">
                <AnimatedNumber value={total.kcal} />
                <span className="ml-1 text-sm font-normal text-muted">kcal</span>
              </span>
            </div>
            <div className="mt-1 text-right">
              <MacroLine p={total.p} c={total.c} f={total.f} />
            </div>
          </div>

          <ul className="divide-y divide-line">
            {items.map((it, i) => {
              const amt = parseAmount(it.unit);
              return (
                <li key={i} className="flex items-center gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium">{it.name}</div>
                    <div className="text-xs text-faint">
                      {qtyLabel(it.qty, it.unit) || '1 serving'} · <span className="tnum">{fmt(it.per.kcal * it.qty)} kcal</span>
                    </div>
                  </div>
                  {amt ? (
                    <div className="relative w-24">
                      <NumberInput value={it.qty * amt.n} onChange={(n) => setQty(i, n / amt.n)} className="h-9 pr-8 text-right text-sm" aria-label="Amount" />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">{amt.u}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button className="step-btn h-8 w-8" aria-label="Less" onClick={() => setQty(i, it.qty - 0.5)}>
                        <Minus size={14} />
                      </button>
                      <span className="tnum w-9 text-center text-sm">{Math.round(it.qty * 100) / 100}</span>
                      <button className="step-btn h-8 w-8" aria-label="More" onClick={() => setQty(i, it.qty + 0.5)}>
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                  <button className="icon-btn text-faint" aria-label={`Remove ${it.name}`} onClick={() => setItems((l) => l.filter((_, j) => j !== i))}>
                    <X size={16} />
                  </button>
                </li>
              );
            })}
          </ul>

          <button className="tile w-full" onClick={() => setStep(data.foods.length ? 'pick' : 'new')}>
            <Plus size={16} /> Add item
          </button>
        </div>
      )}

      {step === 'pick' && (
        <div className="pt-1">
          <div className="relative">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <input className="input pl-10" placeholder="Search saved foods" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button
            className="tile mt-3 w-full"
            onClick={() => {
              setDraft(blankDraft(q.trim()));
              setStep('new');
            }}
          >
            <Plus size={16} /> {q.trim() ? `Create “${q.trim()}”` : 'New item'}
          </button>
          <ul className="mt-3 divide-y divide-line">
            {foods.map((f) => (
              <li key={f.id}>
                <button className="flex w-full items-center gap-3 py-3 text-left active:opacity-60" onClick={() => addItem({ name: f.name, unit: f.unit, qty: 1, per: f.per })}>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium">{f.name}</div>
                    <div className="text-xs text-faint">{f.unit}</div>
                  </div>
                  <span className="tnum text-sm text-muted">{fmt(f.per.kcal)}</span>
                  <Plus size={16} className="text-faint" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === 'new' && (
        <div className="pt-1">
          <FoodForm draft={draft} onChange={setDraft} autoFocus={!draft.name} />
        </div>
      )}
    </Sheet>
  );
}
