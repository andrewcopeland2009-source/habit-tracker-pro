import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as db from '../lib/db';
import { todayKey } from '../lib/date';
import { DEFAULT_CATEGORIES } from '../lib/defaults';
import { buildDemoData } from '../lib/demo';
import { HabitCtx, completionId, type CompletionMap } from '../lib/habits';
import { loadPrefs, savePrefs, type Prefs } from '../lib/prefs';
import type {
  AppData, Category, Completion, DateKey, Goal, Habit, MoodEntry, MoodLevel, Reflection, SleepEntry, StoreName, WaterEntry,
} from '../lib/types';

const EMPTY: AppData = { habits: [], completions: [], categories: [], reflections: [], moods: [], sleep: [], water: [], goals: [] };

export interface Toast {
  id: number;
  message: string;
  tone?: 'info' | 'success' | 'error';
}

interface Store {
  loaded: boolean;
  data: AppData;
  prefs: Prefs;
  today: DateKey;
  dark: boolean;
  ctx: HabitCtx;
  habits: Habit[]; // active, ordered
  categories: Map<string, Category>;
  reflectionsByDate: Map<DateKey, Reflection>;
  moodsByDate: Map<DateKey, MoodEntry>;
  sleepByDate: Map<DateKey, SleepEntry>;
  waterByDate: Map<DateKey, WaterEntry>;
  toasts: Toast[];
  toast: (message: string, tone?: Toast['tone']) => void;
  setPrefs: (p: Partial<Prefs>) => void;
  saveHabit: (h: Habit) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  moveHabit: (id: string, dir: -1 | 1) => Promise<void>;
  setHabitValue: (h: Habit, date: DateKey, value: number) => Promise<void>;
  toggleHabit: (h: Habit, date: DateKey) => Promise<boolean>;
  saveCategory: (c: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  saveReflection: (r: Reflection) => Promise<void>;
  deleteReflection: (date: DateKey) => Promise<void>;
  setMood: (date: DateKey, mood: MoodLevel | null) => Promise<void>;
  saveSleep: (s: SleepEntry) => Promise<void>;
  deleteSleep: (date: DateKey) => Promise<void>;
  addWater: (date: DateKey, ml: number) => Promise<void>;
  undoWater: (date: DateKey) => Promise<void>;
  saveGoal: (g: Goal) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  replaceData: (d: AppData) => Promise<void>;
  setDemo: (on: boolean) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}

/** Local calendar day that rolls over at midnight, on resume and on focus. */
function useTodayKey() {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const check = () => setToday((t) => (t === todayKey() ? t : todayKey()));
    const id = window.setInterval(check, 20_000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);
  return today;
}

function useSystemDark() {
  const [dark, setDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const fn = () => setDark(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return dark;
}

const upsert = <T,>(arr: T[], item: T, key: (t: T) => string) => {
  const k = key(item);
  const i = arr.findIndex((x) => key(x) === k);
  if (i === -1) return [...arr, item];
  const next = arr.slice();
  next[i] = item;
  return next;
};

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs);
  const [data, setData] = useState<AppData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const today = useTodayKey();
  const systemDark = useSystemDark();
  const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && systemDark);
  const dbName = prefs.demo ? db.DEMO_DB : db.REAL_DB;
  const dbRef = useRef(dbName);
  dbRef.current = dbName;

  const toast = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  // Load (or reload when switching between real and demo databases).
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      try {
        let d = await db.loadAll(dbName);
        if (!d.categories.length) {
          await db.putMany(dbName, 'categories', DEFAULT_CATEGORIES);
          d = { ...d, categories: DEFAULT_CATEGORIES };
        }
        if (!cancelled) setData(d);
      } catch (e) {
        console.error(e);
        if (!cancelled) toast('Could not open local storage. Data will not be saved in this browser mode.', 'error');
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dbName, toast]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1c1917' : '#fbf7f0');
  }, [dark]);

  const setPrefs = useCallback((p: Partial<Prefs>) => {
    setPrefsState((cur) => {
      const next = { ...cur, ...p };
      savePrefs(next);
      return next;
    });
  }, []);

  const persist = useCallback(
    async (fn: (name: string) => Promise<void>) => {
      try {
        await fn(dbRef.current);
      } catch (e) {
        console.error(e);
        toast('Saving failed — storage may be full or blocked.', 'error');
      }
    },
    [toast],
  );

  const write = useCallback(
    async <T,>(store: StoreName, item: T, key: (t: T) => string) => {
      setData((d) => ({ ...d, [store]: upsert(d[store] as unknown as T[], item, key) }));
      await persist((n) => db.put(n, store, item));
    },
    [persist],
  );

  const drop = useCallback(
    async (store: StoreName, keyName: 'id' | 'date', key: string) => {
      setData((d) => ({ ...d, [store]: (d[store] as unknown as Record<string, string>[]).filter((x) => x[keyName] !== key) }));
      await persist((n) => db.remove(n, store, key));
    },
    [persist],
  );

  const completionMap: CompletionMap = useMemo(() => new Map(data.completions.map((c) => [c.id, c])), [data.completions]);
  const ctx = useMemo(() => new HabitCtx(completionMap, prefs.weekStart, today), [completionMap, prefs.weekStart, today]);
  const habits = useMemo(() => data.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order), [data.habits]);
  const categories = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);
  const reflectionsByDate = useMemo(() => new Map(data.reflections.map((r) => [r.date, r])), [data.reflections]);
  const moodsByDate = useMemo(() => new Map(data.moods.map((r) => [r.date, r])), [data.moods]);
  const sleepByDate = useMemo(() => new Map(data.sleep.map((r) => [r.date, r])), [data.sleep]);
  const waterByDate = useMemo(() => new Map(data.water.map((r) => [r.date, r])), [data.water]);

  const dataRef = useRef(data);
  dataRef.current = data;

  const store: Store = {
    loaded, data, prefs, today, dark, ctx, habits, categories, reflectionsByDate, moodsByDate, sleepByDate, waterByDate, toasts, toast, setPrefs,

    saveHabit: (h) => write('habits', h, (x) => x.id),
    deleteHabit: async (id) => {
      const ids = dataRef.current.completions.filter((c) => c.habitId === id).map((c) => c.id);
      setData((d) => ({ ...d, habits: d.habits.filter((h) => h.id !== id), completions: d.completions.filter((c) => c.habitId !== id) }));
      await persist(async (n) => {
        await db.remove(n, 'habits', id);
        await db.removeMany(n, 'completions', ids);
      });
    },
    moveHabit: async (id, dir) => {
      const list = dataRef.current.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order);
      const i = list.findIndex((h) => h.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      const updated = list.map((h, order) => ({ ...h, order }));
      const byId = new Map(updated.map((h) => [h.id, h]));
      setData((d) => ({ ...d, habits: d.habits.map((h) => byId.get(h.id) ?? h) }));
      await persist((n) => db.putMany(n, 'habits', updated));
    },
    setHabitValue: async (h, date, value) => {
      const id = completionId(h.id, date);
      if (value <= 0) return drop('completions', 'id', id);
      const c: Completion = { id, habitId: h.id, date, value, updatedAt: Date.now() };
      await write('completions', c, (x) => x.id);
    },
    toggleHabit: async (h, date) => {
      const done = ctx.done(h, date);
      await store.setHabitValue(h, date, done ? 0 : h.target?.amount ?? 1);
      return !done;
    },

    saveCategory: (c) => write('categories', c, (x) => x.id),
    deleteCategory: async (id) => {
      const moved = dataRef.current.habits.filter((h) => h.categoryId === id).map((h) => ({ ...h, categoryId: 'personal' }));
      const movedGoals = dataRef.current.goals.filter((g) => g.categoryId === id).map((g) => ({ ...g, categoryId: 'personal' }));
      setData((d) => ({
        ...d,
        categories: d.categories.filter((c) => c.id !== id),
        habits: d.habits.map((h) => (h.categoryId === id ? { ...h, categoryId: 'personal' } : h)),
        goals: d.goals.map((g) => (g.categoryId === id ? { ...g, categoryId: 'personal' } : g)),
      }));
      await persist(async (n) => {
        await db.remove(n, 'categories', id);
        await db.putMany(n, 'habits', moved);
        await db.putMany(n, 'goals', movedGoals);
      });
    },

    saveReflection: (r) => write('reflections', r, (x) => x.date),
    deleteReflection: (date) => drop('reflections', 'date', date),
    setMood: async (date, mood) => {
      if (mood === null) return drop('moods', 'date', date);
      const prev = dataRef.current.moods.find((m) => m.date === date);
      await write('moods', { ...prev, date, mood, updatedAt: Date.now() }, (x) => x.date);
    },
    saveSleep: (s) => write('sleep', s, (x) => x.date),
    deleteSleep: (date) => drop('sleep', 'date', date),
    addWater: async (date, ml) => {
      const prev = dataRef.current.water.find((w) => w.date === date);
      const entry: WaterEntry = prev
        ? { ...prev, ml: Math.max(0, prev.ml + ml), log: [...prev.log, { at: Date.now(), ml }], updatedAt: Date.now() }
        : { date, ml: Math.max(0, ml), goal: prefs.waterGoal, log: [{ at: Date.now(), ml }], updatedAt: Date.now() };
      entry.goal = date === today ? prefs.waterGoal : entry.goal;
      await write('water', entry, (x) => x.date);
    },
    undoWater: async (date) => {
      const prev = dataRef.current.water.find((w) => w.date === date);
      if (!prev || !prev.log.length) return;
      const last = prev.log[prev.log.length - 1];
      await write('water', { ...prev, ml: Math.max(0, prev.ml - last.ml), log: prev.log.slice(0, -1), updatedAt: Date.now() }, (x) => x.date);
    },
    saveGoal: (g) => write('goals', g, (x) => x.id),
    deleteGoal: (id) => drop('goals', 'id', id),

    replaceData: async (d) => {
      const withCats = d.categories.length ? d : { ...d, categories: DEFAULT_CATEGORIES };
      await db.replaceAll(dbRef.current, withCats);
      setData(withCats);
    },
    setDemo: async (on) => {
      if (on) await db.replaceAll(db.DEMO_DB, buildDemoData(todayKey()));
      setPrefs({ demo: on });
    },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
