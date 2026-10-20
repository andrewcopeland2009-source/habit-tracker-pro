import type { DateKey } from './types';

// All calendar math happens on local Y/M/D triples. Day differences are
// computed via Date.UTC so daylight-saving shifts can never add or lose a day.

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): DateKey {
  return toKey(new Date());
}

export function parseKey(key: DateKey): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

/** Local Date at noon for the key — safe from DST edge cases. */
export function fromKey(key: DateKey): Date {
  const { y, m, d } = parseKey(key);
  return new Date(y, m - 1, d, 12);
}

export function isValidKey(key: unknown): key is DateKey {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return toKey(fromKey(key)) === key;
}

export function addDays(key: DateKey, n: number): DateKey {
  const { y, m, d } = parseKey(key);
  return toKey(new Date(y, m - 1, d + n, 12));
}

export function addMonths(key: DateKey, n: number): DateKey {
  const { y, m } = parseKey(key);
  return toKey(new Date(y, m - 1 + n, 1, 12));
}

const utc = (key: DateKey) => {
  const { y, m, d } = parseKey(key);
  return Date.UTC(y, m - 1, d);
};

/** Whole days from a to b (b - a). */
export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

export function weekday(key: DateKey): number {
  return new Date(utc(key)).getUTCDay();
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthStart(key: DateKey): DateKey {
  const { y, m } = parseKey(key);
  return `${y}-${pad(m)}-01`;
}

export function monthDays(key: DateKey): DateKey[] {
  const { y, m } = parseKey(key);
  return Array.from({ length: daysInMonth(y, m) }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`);
}

/** Start of the week containing key. weekStart: 0 = Sunday, 1 = Monday. */
export function weekStartOf(key: DateKey, weekStart: number): DateKey {
  const offset = (weekday(key) - weekStart + 7) % 7;
  return addDays(key, -offset);
}

export function range(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  const n = diffDays(from, to);
  for (let i = 0; i <= n; i++) out.push(addDays(from, i));
  return out;
}

export function minKey(a: DateKey, b: DateKey) {
  return a < b ? a : b;
}
export function maxKey(a: DateKey, b: DateKey) {
  return a > b ? a : b;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
export function fmt(key: DateKey, opts: Intl.DateTimeFormatOptions): string {
  const id = JSON.stringify(opts);
  let f = fmtCache.get(id);
  if (!f) {
    f = new Intl.DateTimeFormat(undefined, opts);
    fmtCache.set(id, f);
  }
  return f.format(fromKey(key));
}

export const longDate = (k: DateKey) => fmt(k, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
export const shortDate = (k: DateKey) => fmt(k, { month: 'short', day: 'numeric' });
export const monthTitle = (k: DateKey) => fmt(k, { month: 'long', year: 'numeric' });

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Good night.';
  if (h < 12) return 'Good morning.';
  if (h < 17) return 'Good afternoon.';
  if (h < 22) return 'Good evening.';
  return 'Good night.';
}

export function minutesBetween(bed: string, wake: string): number {
  const [bh, bm] = bed.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return mins;
}

export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}
