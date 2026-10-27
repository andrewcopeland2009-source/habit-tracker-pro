import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { todayKey } from './date';
import { mealPer, targetsFor } from './nutrition';
import { clearAll, emptyData, load, save, uid } from './storage';
import type { Data, Entry, Food, Macros, Meal, Slot } from './types';

export type NewEntry = Omit<Entry, 'id' | 'at' | 'ref'>;

interface Store {
  data: Data;
  byDate: Map<string, Entry[]>;
  targetsOn: (date: string) => Macros;
  saveFailed: boolean;
  /** Logs a food. With `remember`, the food is added to (or refreshed in) the saved foods. */
  addEntry: (e: NewEntry, remember?: boolean) => Entry;
  addEntries: (list: Entry[]) => void;
  logMeal: (meal: Meal, date: string, slot: Slot, qty?: number) => Entry;
  updateEntry: (id: string, patch: Partial<Entry>) => void;
  deleteEntry: (id: string) => Entry | undefined;
  restoreEntry: (e: Entry) => void;
  saveFood: (f: Omit<Food, 'id' | 'uses' | 'last' | 'fav'> & Partial<Food>) => Food;
  deleteFood: (id: string) => void;
  toggleFoodFav: (id: string) => void;
  saveMeal: (m: Omit<Meal, 'id' | 'uses' | 'last' | 'fav'> & Partial<Meal>) => Meal;
  deleteMeal: (id: string) => void;
  toggleMealFav: (id: string) => void;
  setTargets: (t: Macros, from?: string) => void;
  replaceAll: (d: Data) => void;
  eraseAll: () => void;
}

const Ctx = createContext<Store | null>(null);

const sameFood = (a: { name: string; unit: string }, b: { name: string; unit: string }) =>
  a.name.trim().toLowerCase() === b.name.trim().toLowerCase() && a.unit.trim().toLowerCase() === b.unit.trim().toLowerCase();

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(load);
  const [saveFailed, setSaveFailed] = useState(false);
  const first = useRef(true);

  // Persist synchronously on every change so closing the app right after logging never loses anything.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaveFailed(!save(data));
  }, [data]);

  const update = useCallback((fn: (d: Data) => Data) => setData(fn), []);

  const byDate = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of data.entries) {
      const list = m.get(e.date);
      if (list) list.push(e);
      else m.set(e.date, [e]);
    }
    for (const list of m.values()) list.sort((a, b) => a.at - b.at);
    return m;
  }, [data.entries]);

  const targetsOn = useCallback((date: string) => targetsFor(data.targets, date), [data.targets]);

  const store = useMemo<Store>(() => {
    const addEntry: Store['addEntry'] = (e, remember = true) => {
      const now = Date.now();
      const entry: Entry = { ...e, id: uid(), at: now };
      update((d) => {
        let foods = d.foods;
        if (remember && e.name.trim()) {
          const existing = foods.find((f) => sameFood(f, e));
          if (existing) {
            entry.ref = existing.id;
            foods = foods.map((f) => (f.id === existing.id ? { ...f, name: e.name.trim(), per: e.per, uses: f.uses + 1, last: now } : f));
          } else {
            const f: Food = { id: uid(), name: e.name.trim(), unit: e.unit.trim(), per: e.per, fav: false, uses: 1, last: now };
            entry.ref = f.id;
            foods = [...foods, f];
          }
        }
        return { ...d, foods, entries: [...d.entries, entry] };
      });
      return entry;
    };

    return {
      data,
      byDate,
      targetsOn,
      saveFailed,
      addEntry,
      addEntries: (list) => update((d) => ({ ...d, entries: [...d.entries, ...list] })),
      logMeal: (meal, date, slot, qty = 1) => {
        const now = Date.now();
        const entry: Entry = { id: uid(), at: now, date, slot, name: meal.name, unit: 'meal', qty, per: mealPer(meal.items), ref: meal.id };
        update((d) => ({
          ...d,
          entries: [...d.entries, entry],
          meals: d.meals.map((m) => (m.id === meal.id ? { ...m, uses: m.uses + 1, last: now } : m)),
        }));
        return entry;
      },
      updateEntry: (id, patch) => update((d) => ({ ...d, entries: d.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      deleteEntry: (id) => {
        const found = data.entries.find((e) => e.id === id);
        update((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));
        return found;
      },
      restoreEntry: (e) => update((d) => (d.entries.some((x) => x.id === e.id) ? d : { ...d, entries: [...d.entries, e] })),
      saveFood: (f) => {
        const food: Food = { fav: false, uses: 0, last: Date.now(), ...f, id: f.id ?? uid(), name: f.name.trim(), unit: f.unit.trim() };
        update((d) => ({
          ...d,
          foods: d.foods.some((x) => x.id === food.id) ? d.foods.map((x) => (x.id === food.id ? food : x)) : [...d.foods, food],
        }));
        return food;
      },
      deleteFood: (id) => update((d) => ({ ...d, foods: d.foods.filter((f) => f.id !== id) })),
      toggleFoodFav: (id) => update((d) => ({ ...d, foods: d.foods.map((f) => (f.id === id ? { ...f, fav: !f.fav } : f)) })),
      saveMeal: (m) => {
        const meal: Meal = { fav: false, uses: 0, last: Date.now(), ...m, id: m.id ?? uid(), name: m.name.trim() };
        update((d) => ({
          ...d,
          meals: d.meals.some((x) => x.id === meal.id) ? d.meals.map((x) => (x.id === meal.id ? meal : x)) : [...d.meals, meal],
        }));
        return meal;
      },
      deleteMeal: (id) => update((d) => ({ ...d, meals: d.meals.filter((m) => m.id !== id) })),
      toggleMealFav: (id) => update((d) => ({ ...d, meals: d.meals.map((m) => (m.id === id ? { ...m, fav: !m.fav } : m)) })),
      setTargets: (t, from = todayKey()) =>
        update((d) => {
          const targets = d.targets.filter((x) => x.from !== from);
          // The very first change replaces the defaults everywhere, so history starts from your own targets.
          const onlyDefault = d.targets.length === 1 && d.targets[0].from === '0000-01-01' && d.entries.length === 0;
          if (onlyDefault) return { ...d, targets: [{ from: '0000-01-01', t }] };
          return { ...d, targets: [...targets, { from, t }].sort((a, b) => a.from.localeCompare(b.from)) };
        }),
      replaceAll: (next) => update(() => next),
      eraseAll: () => {
        clearAll();
        update(() => emptyData());
      },
    };
  }, [data, byDate, targetsOn, saveFailed, update]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}
