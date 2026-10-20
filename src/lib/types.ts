/** Local calendar date in the form YYYY-MM-DD. Never a UTC timestamp. */
export type DateKey = string;

export type Schedule =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: number[] } // 0 = Sunday … 6 = Saturday
  | { kind: 'timesPerWeek'; times: number }
  | { kind: 'interval'; every: number }; // every N days counted from the start date

export interface HabitTarget {
  amount: number;
  unit: string;
}

export interface Habit {
  id: string;
  name: string;
  description: string;
  icon: string;
  categoryId: string;
  color: string; // palette key, see lib/palette.ts
  schedule: Schedule;
  startDate: DateKey;
  target?: HabitTarget;
  order: number;
  archived: boolean;
  createdAt: number;
}

export interface Completion {
  id: string; // `${habitId}|${date}`
  habitId: string;
  date: DateKey;
  value: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  builtIn: boolean;
}

export interface Reflection {
  date: DateKey;
  gratitude: [string, string, string];
  reminders: [string, string];
  favorites: [boolean, boolean];
  status: 'draft' | 'complete';
  completedAt?: number;
  updatedAt: number;
}

export type MoodLevel = 1 | 2 | 3 | 4 | 5; // 5 = Amazing … 1 = Rough

export interface MoodEntry {
  date: DateKey;
  mood: MoodLevel;
  note?: string;
  updatedAt: number;
}

export interface SleepEntry {
  date: DateKey; // the morning the user woke up
  bedtime: string; // HH:MM
  wake: string; // HH:MM
  minutes: number;
  quality?: 1 | 2 | 3 | 4 | 5;
  updatedAt: number;
}

export interface WaterEntry {
  date: DateKey;
  ml: number;
  goal: number;
  log: { at: number; ml: number }[];
  updatedAt: number;
}

export type GoalPeriod = 'weekly' | 'monthly';

export interface Goal {
  id: string;
  title: string;
  description: string;
  period: GoalPeriod;
  target: number;
  current: number;
  unit: string;
  deadline: DateKey;
  categoryId: string;
  createdAt: number;
  completedAt?: number;
  archived: boolean;
}

export interface AppData {
  habits: Habit[];
  completions: Completion[];
  categories: Category[];
  reflections: Reflection[];
  moods: MoodEntry[];
  sleep: SleepEntry[];
  water: WaterEntry[];
  goals: Goal[];
}

export const STORE_NAMES = [
  'habits',
  'completions',
  'categories',
  'reflections',
  'moods',
  'sleep',
  'water',
  'goals',
] as const;
export type StoreName = (typeof STORE_NAMES)[number];
