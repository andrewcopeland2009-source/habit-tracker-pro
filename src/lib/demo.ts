import { addDays, minutesBetween, range, weekday } from './date';
import { DEFAULT_CATEGORIES, HABIT_TEMPLATES, habitFromTemplate, uid } from './defaults';
import { completionId } from './habits';
import type { AppData, Completion, Goal, MoodEntry, MoodLevel, Reflection, SleepEntry, WaterEntry } from './types';

// Deterministic pseudo-random generator so the demo looks the same each time.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const GRATITUDE = [
  'Morning light through the kitchen window',
  'A long call with my sister',
  'Coffee that was exactly right',
  'Finishing the chapter I started last week',
  'A walk without headphones',
  'Fresh sheets',
  'A friend who checked in',
  'Rain on the roof while I worked',
  'A quiet hour to myself',
  'Leftovers that tasted even better',
  'My body carrying me through a workout',
  'A kind note from a coworker',
  'The smell of the bakery on the corner',
  'Having a home to come back to',
  'Laughing until it hurt',
];
const REMINDERS = [
  'Progress takes time.',
  'I don’t need to have everything figured out.',
  'Rest is productive too.',
  'Comparison steals the joy.',
  'Done is better than perfect.',
  'I can do hard things slowly.',
  'Ask for help sooner.',
  'Not every thought deserves belief.',
];

export function buildDemoData(today: string): AppData {
  const r = rng(42);
  const start = addDays(today, -89);
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  const chosen = [0, 1, 2, 3, 4, 5, 6, 7, 10];
  const habits = chosen.map((i, order) => habitFromTemplate(HABIT_TEMPLATES[i], start, order));
  const skill = [0.85, 0.7, 0.62, 0.8, 0.5, 0.74, 0.42, 0.66, 0.9];

  const completions: Completion[] = [];
  const reflections: Reflection[] = [];
  const moods: MoodEntry[] = [];
  const sleep: SleepEntry[] = [];
  const water: WaterEntry[] = [];

  for (const [di, d] of range(start, today).entries()) {
    const ramp = 0.75 + (di / 90) * 0.3; // gentle improvement over time
    const weekendDip = [0, 6].includes(weekday(d)) ? 0.85 : 1;
    habits.forEach((h, hi) => {
      if (d === today && r() < 0.5) return;
      const p = Math.min(0.97, skill[hi] * ramp * weekendDip);
      if (r() < p) {
        const amount = h.target?.amount ?? 1;
        completions.push({ id: completionId(h.id, d), habitId: h.id, date: d, value: amount, updatedAt: Date.now() });
      }
    });
    if (d !== today && r() < 0.86) {
      reflections.push({
        date: d,
        gratitude: [pick(GRATITUDE), pick(GRATITUDE), pick(GRATITUDE)],
        reminders: [pick(REMINDERS), pick(REMINDERS)],
        favorites: [r() < 0.08, r() < 0.05],
        status: 'complete',
        completedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    if (r() < 0.9) {
      const mood = Math.max(1, Math.min(5, Math.round(3.4 + (r() - 0.45) * 3.2))) as MoodLevel;
      moods.push({ date: d, mood, updatedAt: Date.now() });
    }
    if (r() < 0.88) {
      const bh = 22 + Math.floor(r() * 2);
      const bm = Math.floor(r() * 4) * 15;
      const wh = 6 + Math.floor(r() * 2);
      const wm = Math.floor(r() * 4) * 15;
      const bed = `${String(bh % 24).padStart(2, '0')}:${String(bm).padStart(2, '0')}`;
      const wake = `${String(wh).padStart(2, '0')}:${String(wm).padStart(2, '0')}`;
      sleep.push({ date: d, bedtime: bed, wake, minutes: minutesBetween(bed, wake), quality: (2 + Math.floor(r() * 4)) as 2, updatedAt: Date.now() });
    }
    const ml = Math.round((800 + r() * 1700) / 50) * 50;
    water.push({ date: d, ml, goal: 2000, log: [{ at: Date.now(), ml }], updatedAt: Date.now() });
  }

  const goals: Goal[] = [
    { id: uid(), title: 'Read 3 books', description: 'Fiction counts.', period: 'monthly', target: 3, current: 2, unit: 'books', deadline: addDays(today, 12), categoryId: 'learning', createdAt: Date.now(), archived: false },
    { id: uid(), title: 'Run 20 km', description: 'Easy pace is fine.', period: 'weekly', target: 20, current: 13, unit: 'km', deadline: addDays(today, 4), categoryId: 'fitness', createdAt: Date.now(), archived: false },
    { id: uid(), title: 'Cook at home 5 times', description: '', period: 'weekly', target: 5, current: 3, unit: 'meals', deadline: addDays(today, 3), categoryId: 'lifestyle', createdAt: Date.now(), archived: false },
    { id: uid(), title: 'Launch portfolio site', description: 'Finish the about page and publish.', period: 'monthly', target: 100, current: 65, unit: '%', deadline: addDays(today, 20), categoryId: 'business', createdAt: Date.now(), archived: false },
    { id: uid(), title: 'Save $400', description: '', period: 'monthly', target: 400, current: 400, unit: '$', deadline: addDays(today, -8), categoryId: 'business', createdAt: Date.now(), completedAt: Date.now() - 9 * 864e5, archived: false },
    { id: uid(), title: 'Meditate 7 days straight', description: '', period: 'weekly', target: 7, current: 7, unit: 'days', deadline: addDays(today, -15), categoryId: 'health', createdAt: Date.now(), completedAt: Date.now() - 16 * 864e5, archived: false },
  ];

  return { habits, completions, categories: DEFAULT_CATEGORIES, reflections, moods, sleep, water, goals };
}
