const pad = (n: number) => String(n).padStart(2, '0');

export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const todayKey = () => toKey(new Date());

export const addDays = (k: string, n: number) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
};

/** Monday of the week containing `k`. */
export const weekStart = (k: string) => {
  const d = fromKey(k);
  return addDays(k, -((d.getDay() + 6) % 7));
};

export const range = (from: string, days: number) => Array.from({ length: days }, (_, i) => addDays(from, i));

export function dayLabel(k: string, today = todayKey()) {
  if (k === today) return 'Today';
  if (k === addDays(today, -1)) return 'Yesterday';
  if (k === addDays(today, 1)) return 'Tomorrow';
  const d = fromKey(k);
  const sameYear = d.getFullYear() === fromKey(today).getFullYear();
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

export const longDate = (k: string) =>
  fromKey(k).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

export const shortDate = (k: string) => fromKey(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export const monthLabel = (y: number, m: number) =>
  new Date(y, m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

export const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
