import { DEFAULT_TARGETS } from './nutrition';
import type { Data, Entry, Food, Macros, Meal, MealItem, Slot, TargetChange } from './types';
import { SLOTS } from './types';

const KEY = 'kcal.data.v1';
const BACKUP_KEY = 'kcal.data.v1.prev';
const META_KEY = 'kcal.meta.v1';

export const emptyData = (): Data => ({
  version: 1,
  targets: [{ from: '0000-01-01', t: { ...DEFAULT_TARGETS } }],
  entries: [],
  foods: [],
  meals: [],
});

export function load(): Data {
  for (const key of [KEY, BACKUP_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = validate(JSON.parse(raw));
      // Keep the last good copy from the previous session as a fallback.
      if (key === KEY) localStorage.setItem(BACKUP_KEY, raw);
      return data;
    } catch {
      /* try the next copy */
    }
  }
  return emptyData();
}

/** Returns false if the browser refused the write (e.g. storage full). */
export function save(data: Data): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearAll() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(BACKUP_KEY);
  } catch {
    /* ignore */
  }
}

interface Meta {
  lastExport?: number;
}

export function getMeta(): Meta {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || '{}');
  } catch {
    return {};
  }
}

export function setMeta(m: Meta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify({ ...getMeta(), ...m }));
  } catch {
    /* ignore */
  }
}

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistence(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

/* ---------- validation (used on load and on import) ---------- */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : 0);
const s = (x: unknown, max = 200) => (typeof x === 'string' ? x.slice(0, max) : '');
const id = (x: unknown) => (typeof x === 'string' && x ? x : uid());

function macros(x: unknown): Macros {
  if (!isObj(x)) throw new Error('Invalid nutrition values');
  return { kcal: n(x.kcal), p: n(x.p), c: n(x.c), f: n(x.f) };
}

function entry(x: unknown): Entry {
  if (!isObj(x) || typeof x.date !== 'string' || !DATE.test(x.date)) throw new Error('Invalid entry');
  return {
    id: id(x.id),
    date: x.date,
    slot: SLOTS.includes(x.slot as Slot) ? (x.slot as Slot) : 'snack',
    name: s(x.name) || 'Food',
    unit: s(x.unit, 60),
    qty: n(x.qty) || 1,
    per: macros(x.per),
    at: n(x.at),
    ...(typeof x.ref === 'string' ? { ref: x.ref } : {}),
  };
}

function food(x: unknown): Food {
  if (!isObj(x)) throw new Error('Invalid food');
  return { id: id(x.id), name: s(x.name) || 'Food', unit: s(x.unit, 60), per: macros(x.per), fav: x.fav === true, uses: n(x.uses), last: n(x.last) };
}

function item(x: unknown): MealItem {
  if (!isObj(x)) throw new Error('Invalid meal item');
  return { name: s(x.name) || 'Food', unit: s(x.unit, 60), qty: n(x.qty) || 1, per: macros(x.per) };
}

function meal(x: unknown): Meal {
  if (!isObj(x) || !Array.isArray(x.items)) throw new Error('Invalid meal');
  return { id: id(x.id), name: s(x.name) || 'Meal', items: x.items.map(item), fav: x.fav === true, uses: n(x.uses), last: n(x.last) };
}

function target(x: unknown): TargetChange {
  if (!isObj(x) || typeof x.from !== 'string' || !DATE.test(x.from)) throw new Error('Invalid targets');
  return { from: x.from, t: macros(x.t) };
}

export function validate(raw: unknown): Data {
  if (!isObj(raw) || raw.version !== 1) throw new Error('This file is not a calorie tracker backup.');
  const arr = (k: string) => {
    const v = raw[k];
    if (!Array.isArray(v)) throw new Error(`Backup is missing "${k}".`);
    return v;
  };
  const targets = arr('targets').map(target).sort((a, b) => a.from.localeCompare(b.from));
  return {
    version: 1,
    targets: targets.length ? targets : emptyData().targets,
    entries: arr('entries').map(entry),
    foods: arr('foods').map(food),
    meals: arr('meals').map(meal),
  };
}

export function uid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** On phones, hand the file to the share sheet (e.g. "Save to Files"); otherwise download it. */
export async function exportBackup(data: Data, today: string): Promise<'saved' | 'cancelled'> {
  const name = `calories-backup-${today}.json`;
  const json = JSON.stringify(data, null, 1);
  const file = new File([json], name, { type: 'application/json' });
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      setMeta({ lastExport: Date.now() });
      return 'saved';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // Sharing unavailable for another reason: fall through to a download.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setMeta({ lastExport: Date.now() });
  return 'saved';
}
