import type { Entry, Food, Macros, Meal, MealItem, Slot, TargetChange } from './types';

export const ZERO: Macros = { kcal: 0, p: 0, c: 0, f: 0 };

export const DEFAULT_TARGETS: Macros = { kcal: 2000, p: 150, c: 200, f: 65 };

export const scale = (m: Macros, k: number): Macros => ({ kcal: m.kcal * k, p: m.p * k, c: m.c * k, f: m.f * k });

export const add = (a: Macros, b: Macros): Macros => ({ kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f });

export const sum = (list: Macros[]) => list.reduce(add, ZERO);

export const entryTotal = (e: Pick<Entry, 'per' | 'qty'>) => scale(e.per, e.qty);

export const totalOf = (entries: Entry[]) => sum(entries.map(entryTotal));

export const mealPer = (items: MealItem[]) => sum(items.map((i) => scale(i.per, i.qty)));

export const kcalFromMacros = (m: Pick<Macros, 'p' | 'c' | 'f'>) => m.p * 4 + m.c * 4 + m.f * 9;

export function targetsFor(changes: TargetChange[], date: string): Macros {
  let t = changes[0]?.t ?? DEFAULT_TARGETS;
  for (const ch of changes) {
    if (ch.from <= date) t = ch.t;
    else break;
  }
  return t;
}

/** Pick the meal slot that fits the current time of day. */
export function slotForNow(d = new Date()): Slot {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 4 && h < 10.5) return 'breakfast';
  if (h >= 10.5 && h < 15) return 'lunch';
  if (h >= 17 && h < 21.5) return 'dinner';
  return 'snack';
}

/** Favorites first, then by how often and how recently something was used. */
export function rank<T extends Food | Meal>(list: T[]) {
  const now = Date.now();
  const score = (x: T) => x.uses / (1 + (now - x.last) / (14 * 864e5));
  return [...list].sort((a, b) => Number(b.fav) - Number(a.fav) || score(b) - score(a) || a.name.localeCompare(b.name));
}

/** If a serving label is a plain amount like "100 g", return the amount and unit so portions can be entered by weight. */
export function parseAmount(unit: string): { n: number; u: string } | null {
  const m = unit.trim().match(/^(\d+(?:[.,]\d+)?)\s*(g|gr|grams?|ml|oz|fl oz)$/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  return n > 0 ? { n, u: m[2].toLowerCase().startsWith('gr') ? 'g' : m[2].toLowerCase() } : null;
}

const nf0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

export const fmt = (n: number) => nf0.format(Math.round(n));
export const fmt1 = (n: number) => nf1.format(Math.round(n * 10) / 10);

export function qtyLabel(qty: number, unit: string) {
  const a = parseAmount(unit);
  if (a) return `${fmt1(a.n * qty)} ${a.u}`;
  if (!unit) return qty === 1 ? '' : `×${fmt1(qty)}`;
  return qty === 1 ? unit : `${fmt1(qty)} × ${unit}`;
}

export const num = (s: string) => {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
