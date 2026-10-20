// Habit / category colors. Each swatch has a soft fill, a deeper ink and a
// mid tone used for charts, tuned separately for light and dark themes.

export interface Swatch {
  key: string;
  label: string;
  light: { fill: string; mid: string; ink: string };
  dark: { fill: string; mid: string; ink: string };
}

export const SWATCHES: Swatch[] = [
  { key: 'blush', label: 'Blush', light: { fill: '#fbe1e4', mid: '#f2a9b4', ink: '#a8485a' }, dark: { fill: '#4a2c33', mid: '#c98592', ink: '#f2c1ca' } },
  { key: 'peach', label: 'Peach', light: { fill: '#fde6d6', mid: '#f6b48c', ink: '#a95a2a' }, dark: { fill: '#4b3226', mid: '#d39a72', ink: '#f6cdb2' } },
  { key: 'butter', label: 'Butter', light: { fill: '#fdf3cc', mid: '#f1d475', ink: '#8a6a12' }, dark: { fill: '#46402a', mid: '#d2bb6c', ink: '#f1e2a8' } },
  { key: 'sage', label: 'Sage', light: { fill: '#e1eedd', mid: '#a9cc9f', ink: '#4a7340' }, dark: { fill: '#2c3b2b', mid: '#8fb385', ink: '#c8e0c1' } },
  { key: 'mint', label: 'Mint', light: { fill: '#daf1ea', mid: '#93d3c0', ink: '#2f7563' }, dark: { fill: '#253c36', mid: '#7cb9a7', ink: '#bfe5d9' } },
  { key: 'powder', label: 'Powder', light: { fill: '#dcebf8', mid: '#9cc4e8', ink: '#336c9b' }, dark: { fill: '#26364a', mid: '#81a8cc', ink: '#c3dbf1' } },
  { key: 'lavender', label: 'Lavender', light: { fill: '#e9e1f6', mid: '#bea9e3', ink: '#644a96' }, dark: { fill: '#352c47', mid: '#a491c6', ink: '#d9cdef' } },
  { key: 'coral', label: 'Coral', light: { fill: '#fddcd5', mid: '#f39b89', ink: '#a8432f' }, dark: { fill: '#4b2b26', mid: '#d48474', ink: '#f6c3b8' } },
  { key: 'rose', label: 'Rose', light: { fill: '#f6dcea', mid: '#e3a2c4', ink: '#934170' }, dark: { fill: '#45293a', mid: '#c286a7', ink: '#efc4dc' } },
  { key: 'stone', label: 'Stone', light: { fill: '#ebe6df', mid: '#c4b8a8', ink: '#6b5d4c' }, dark: { fill: '#38332e', mid: '#a59886', ink: '#ddd3c6' } },
];

const byKey = new Map(SWATCHES.map((s) => [s.key, s]));

export function swatch(key: string, dark: boolean) {
  const s = byKey.get(key) ?? SWATCHES[0];
  return dark ? s.dark : s.light;
}

export const MOOD_META = {
  5: { label: 'Amazing', color: 'butter' },
  4: { label: 'Good', color: 'sage' },
  3: { label: 'Okay', color: 'powder' },
  2: { label: 'Low', color: 'lavender' },
  1: { label: 'Rough', color: 'blush' },
} as const;

/** Five-step completion scale used by bars, cells and the heatmap. */
export function intensityColor(pct: number, dark: boolean): string {
  const light = ['#f1ebe2', '#fbe1e4', '#fde6d6', '#fdf3cc', '#e1eedd', '#b9dbb0'];
  const darkS = ['#2f2a27', '#4a2c33', '#4b3226', '#46402a', '#2c3b2b', '#466a40'];
  const s = dark ? darkS : light;
  if (pct <= 0) return s[0];
  if (pct < 0.25) return s[1];
  if (pct < 0.5) return s[2];
  if (pct < 0.75) return s[3];
  if (pct < 1) return s[4];
  return s[5];
}

export function barColor(pct: number, dark: boolean): string {
  const light = ['#f2a9b4', '#f6b48c', '#f1d475', '#a9cc9f', '#86bd7a'];
  const darkS = ['#c98592', '#d39a72', '#d2bb6c', '#8fb385', '#7fb072'];
  const s = dark ? darkS : light;
  if (pct < 0.25) return s[0];
  if (pct < 0.5) return s[1];
  if (pct < 0.75) return s[2];
  if (pct < 1) return s[3];
  return s[4];
}
