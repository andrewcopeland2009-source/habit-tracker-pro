// Lightweight preferences live in localStorage. Every access is guarded so a
// private window or blocked storage never breaks the app.

export type ThemePref = 'light' | 'dark' | 'system';

export interface Prefs {
  name: string;
  theme: ThemePref;
  weekStart: 0 | 1;
  onboarded: boolean;
  demo: boolean;
  waterGoal: number;
  waterServings: number[];
  reflectionRequired: boolean;
  reminders: {
    morning: { enabled: boolean; time: string };
    habits: { enabled: boolean; time: string };
    evening: { enabled: boolean; time: string };
  };
  lastTab: string;
}

export const DEFAULT_PREFS: Prefs = {
  name: '',
  theme: 'system',
  weekStart: 1,
  onboarded: false,
  demo: false,
  waterGoal: 2000,
  waterServings: [150, 250, 350, 500],
  reflectionRequired: true,
  reminders: {
    morning: { enabled: false, time: '08:00' },
    habits: { enabled: false, time: '13:00' },
    evening: { enabled: false, time: '20:30' },
  },
  lastTab: 'today',
};

const KEY = 'htp.prefs.v1';

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...p, reminders: { ...DEFAULT_PREFS.reminders, ...(p.reminders ?? {}) } };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}

export function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function lsSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}
export function ssGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
export function ssSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}
