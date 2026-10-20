import { DB_VERSION } from './db';
import { isValidKey } from './date';
import { MOOD_META } from './palette';
import type { AppData, Category, Completion, Goal, Habit, MoodEntry, Reflection, SleepEntry, WaterEntry } from './types';

export const EXPORT_APP = 'habit-tracker-pro';

export interface ExportFile {
  app: typeof EXPORT_APP;
  schema: number;
  exportedAt: string;
  data: AppData;
}

export function buildExport(data: AppData): ExportFile {
  return { app: EXPORT_APP, schema: DB_VERSION, exportedAt: new Date().toISOString(), data };
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- validation ----------

const str = (v: unknown, max = 2000): v is string => typeof v === 'string' && v.length <= max;
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const bool = (v: unknown): v is boolean => typeof v === 'boolean';
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const time = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

function validSchedule(s: unknown) {
  if (!obj(s)) return false;
  switch (s.kind) {
    case 'daily':
      return true;
    case 'weekdays':
      return Array.isArray(s.days) && s.days.length > 0 && s.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    case 'timesPerWeek':
      return Number.isInteger(s.times) && (s.times as number) >= 1 && (s.times as number) <= 7;
    case 'interval':
      return Number.isInteger(s.every) && (s.every as number) >= 1 && (s.every as number) <= 365;
    default:
      return false;
  }
}

const validators = {
  habits: (h: unknown): h is Habit =>
    obj(h) && str(h.id, 64) && str(h.name, 120) && str(h.description) && str(h.icon, 40) && str(h.categoryId, 64) &&
    str(h.color, 30) && validSchedule(h.schedule) && isValidKey(h.startDate) && num(h.order) && bool(h.archived) &&
    num(h.createdAt) && (h.target === undefined || (obj(h.target) && num(h.target.amount) && str(h.target.unit, 30))),
  completions: (c: unknown): c is Completion =>
    obj(c) && str(c.id, 140) && str(c.habitId, 64) && isValidKey(c.date) && num(c.value) && c.id === `${c.habitId}|${c.date}`,
  categories: (c: unknown): c is Category => obj(c) && str(c.id, 64) && str(c.name, 60) && str(c.color, 30) && bool(c.builtIn),
  reflections: (r: unknown): r is Reflection =>
    obj(r) && isValidKey(r.date) && Array.isArray(r.gratitude) && r.gratitude.length === 3 && r.gratitude.every((g) => str(g)) &&
    Array.isArray(r.reminders) && r.reminders.length === 2 && r.reminders.every((g) => str(g)) &&
    Array.isArray(r.favorites) && r.favorites.length === 2 && (r.status === 'draft' || r.status === 'complete') && num(r.updatedAt),
  moods: (m: unknown): m is MoodEntry => obj(m) && isValidKey(m.date) && num(m.mood) && m.mood in MOOD_META && num(m.updatedAt),
  sleep: (s: unknown): s is SleepEntry =>
    obj(s) && isValidKey(s.date) && time(s.bedtime) && time(s.wake) && num(s.minutes) && s.minutes > 0 && s.minutes <= 1440,
  water: (w: unknown): w is WaterEntry => obj(w) && isValidKey(w.date) && num(w.ml) && w.ml >= 0 && num(w.goal) && Array.isArray(w.log),
  goals: (g: unknown): g is Goal =>
    obj(g) && str(g.id, 64) && str(g.title, 160) && str(g.description) && (g.period === 'weekly' || g.period === 'monthly') &&
    num(g.target) && g.target > 0 && num(g.current) && str(g.unit, 30) && isValidKey(g.deadline) && str(g.categoryId, 64) && bool(g.archived),
};

export interface ImportResult {
  data: AppData;
  counts: Record<keyof AppData, number>;
  skipped: number;
}

export function parseImport(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (!obj(parsed) || parsed.app !== EXPORT_APP || !obj(parsed.data)) {
    throw new Error('This file is not a Habit Tracker Pro export.');
  }
  if (!num(parsed.schema) || parsed.schema > DB_VERSION) {
    throw new Error('This export was made by a newer version of the app. Update first, then import.');
  }
  const src = parsed.data;
  let skipped = 0;
  const out = {} as Record<string, unknown[]>;
  const counts = {} as Record<keyof AppData, number>;
  for (const key of Object.keys(validators) as (keyof AppData)[]) {
    const arr = Array.isArray(src[key]) ? (src[key] as unknown[]) : [];
    const valid = arr.filter(validators[key] as (v: unknown) => boolean);
    skipped += arr.length - valid.length;
    out[key] = valid;
    counts[key] = valid.length;
  }
  if (!counts.habits && !counts.reflections && !counts.completions && !counts.goals) {
    throw new Error('No usable records were found in this file.');
  }
  return { data: out as unknown as AppData, counts, skipped };
}

// ---------- CSV ----------

const esc = (v: unknown) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: unknown[][]) => rows.map((r) => r.map(esc).join(',')).join('\r\n');

export function habitCsv(d: AppData) {
  const habits = new Map(d.habits.map((h) => [h.id, h]));
  const cats = new Map(d.categories.map((c) => [c.id, c.name]));
  const rows: unknown[][] = [['date', 'habit', 'category', 'value', 'target', 'unit', 'completed']];
  for (const c of [...d.completions].sort((a, b) => a.date.localeCompare(b.date))) {
    const h = habits.get(c.habitId);
    if (!h) continue;
    const target = h.target?.amount ?? 1;
    rows.push([c.date, h.name, cats.get(h.categoryId) ?? '', c.value, target, h.target?.unit ?? '', c.value >= target ? 'yes' : 'no']);
  }
  return csv(rows);
}

export function journalCsv(d: AppData) {
  const moods = new Map(d.moods.map((m) => [m.date, MOOD_META[m.mood].label]));
  const rows: unknown[][] = [['date', 'grateful_1', 'grateful_2', 'grateful_3', 'reminder_1', 'reminder_2', 'mood', 'status']];
  for (const r of [...d.reflections].sort((a, b) => a.date.localeCompare(b.date))) {
    rows.push([r.date, ...r.gratitude, ...r.reminders, moods.get(r.date) ?? '', r.status]);
  }
  return csv(rows);
}

export function wellnessCsv(d: AppData) {
  const dates = new Set([...d.moods, ...d.sleep, ...d.water].map((x) => x.date));
  const moods = new Map(d.moods.map((m) => [m.date, m]));
  const sleep = new Map(d.sleep.map((m) => [m.date, m]));
  const water = new Map(d.water.map((m) => [m.date, m]));
  const rows: unknown[][] = [['date', 'mood', 'bedtime', 'wake', 'sleep_minutes', 'water_ml', 'water_goal_ml']];
  for (const date of [...dates].sort()) {
    const m = moods.get(date);
    const s = sleep.get(date);
    const w = water.get(date);
    rows.push([date, m ? MOOD_META[m.mood].label : '', s?.bedtime ?? '', s?.wake ?? '', s?.minutes ?? '', w?.ml ?? '', w?.goal ?? '']);
  }
  return csv(rows);
}
