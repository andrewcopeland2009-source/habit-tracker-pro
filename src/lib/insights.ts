import { WEEKDAY_LONG, addDays, addMonths, diffDays, maxKey, monthStart, range, weekStartOf, weekday } from './date';
import type { HabitCtx } from './habits';
import type { DateKey, Goal, Habit, MoodEntry, Reflection, SleepEntry } from './types';

export function reflectionStreaks(reflections: Reflection[], today: DateKey) {
  const done = new Set(reflections.filter((r) => r.status === 'complete').map((r) => r.date));
  let current = 0;
  let d = done.has(today) ? today : addDays(today, -1);
  while (done.has(d)) {
    current++;
    d = addDays(d, -1);
  }
  const sorted = [...done].sort();
  let longest = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && diffDays(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return { current, longest, total: done.size };
}

export interface HabitScore {
  habit: Habit;
  pct: number;
  due: number;
  done: number;
  streak: number;
  longest: number;
}

export function habitScores(ctx: HabitCtx, habits: Habit[], from: DateKey, to: DateKey): HabitScore[] {
  return habits.map((h) => {
    const r = ctx.habitRate(h, from, to);
    return { habit: h, pct: r.pct, due: r.due, done: r.done, streak: ctx.streak(h), longest: ctx.longestStreak(h) };
  });
}

export function earliestStart(habits: Habit[], today: DateKey) {
  return habits.reduce((m, h) => (h.startDate < m ? h.startDate : m), today);
}

export function weekdayPerformance(ctx: HabitCtx, habits: Habit[], today: DateKey, days = 90) {
  const from = maxKey(addDays(today, -(days - 1)), earliestStart(habits, today));
  const acc = Array.from({ length: 7 }, () => ({ scheduled: 0, done: 0 }));
  for (const d of range(from, addDays(today, -1) < from ? today : addDays(today, -1))) {
    const s = ctx.day(habits, d);
    acc[weekday(d)].scheduled += s.scheduled;
    acc[weekday(d)].done += s.done;
  }
  return acc.map((a, i) => ({ day: i, pct: a.scheduled ? a.done / a.scheduled : 0, scheduled: a.scheduled }));
}

export function periodCompare(ctx: HabitCtx, habits: Habit[], today: DateKey, weekStart: number) {
  const ws = weekStartOf(today, weekStart);
  const thisWeek = ctx.rangeStats(habits, ws, today);
  const lastWeek = ctx.rangeStats(habits, addDays(ws, -7), addDays(ws, -1));
  const ms = monthStart(today);
  const thisMonth = ctx.rangeStats(habits, ms, today);
  const lastMonth = ctx.rangeStats(habits, addMonths(today, -1), addDays(ms, -1));
  return { thisWeek, lastWeek, thisMonth, lastMonth };
}

export function goalCompletion(goals: Goal[]) {
  const live = goals.filter((g) => !g.archived);
  if (!live.length) return { pct: 0, done: 0, total: 0 };
  const done = live.filter((g) => g.current >= g.target).length;
  return { pct: done / live.length, done, total: live.length };
}

export function reflectionConsistency(reflections: Reflection[], today: DateKey, firstDay: DateKey, days = 30) {
  const from = maxKey(addDays(today, -(days - 1)), firstDay);
  const span = diffDays(from, today) + 1;
  const set = new Set(reflections.filter((r) => r.status === 'complete' && r.date >= from && r.date <= today).map((r) => r.date));
  return { pct: span > 0 ? set.size / span : 0, count: set.size, span };
}

export function moodStats(moods: MoodEntry[], from: DateKey, to: DateKey) {
  const inRange = moods.filter((m) => m.date >= from && m.date <= to);
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const m of inRange) counts[m.mood]++;
  let common: number | null = null;
  for (const k of [5, 4, 3, 2, 1]) if (counts[k] && (common === null || counts[k] > counts[common])) common = k;
  const avg = inRange.length ? inRange.reduce((a, m) => a + m.mood, 0) / inRange.length : 0;
  return { counts, common, avg, total: inRange.length };
}

export function sleepStats(sleep: SleepEntry[], from: DateKey, to: DateKey) {
  const s = sleep.filter((x) => x.date >= from && x.date <= to);
  if (!s.length) return { avg: 0, count: 0, consistency: 0, bedSpread: 0 };
  const avg = s.reduce((a, x) => a + x.minutes, 0) / s.length;
  // Bedtime as minutes relative to 18:00 so times around midnight average sensibly.
  const beds = s.map((x) => {
    const [h, m] = x.bedtime.split(':').map(Number);
    return (h * 60 + m - 18 * 60 + 1440) % 1440;
  });
  const mean = beds.reduce((a, b) => a + b, 0) / beds.length;
  const sd = Math.sqrt(beds.reduce((a, b) => a + (b - mean) ** 2, 0) / beds.length);
  // 0 min spread → 100%, ≥ 120 min spread → 0%.
  const consistency = Math.max(0, 1 - sd / 120);
  return { avg, count: s.length, consistency, bedSpread: sd };
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Plain-language observations backed by recorded data only. */
export function buildInsights(opts: {
  ctx: HabitCtx;
  habits: Habit[];
  today: DateKey;
  weekStart: number;
  reflections: Reflection[];
  moods: MoodEntry[];
  sleep: SleepEntry[];
}): string[] {
  const { ctx, habits, today, weekStart, reflections, moods, sleep } = opts;
  const out: string[] = [];
  if (!habits.length) return out;
  const from30 = addDays(today, -29);
  const scores = habitScores(ctx, habits, monthStart(today), today).filter((s) => s.due >= 5);
  if (scores.length >= 1) {
    const best = [...scores].sort((a, b) => b.pct - a.pct)[0];
    if (best.pct > 0) out.push(`Your most consistent habit this month is ${best.habit.name.toLowerCase()} — ${pct(best.pct)} of scheduled days.`);
  }
  if (scores.length >= 2) {
    const worst = [...scores].sort((a, b) => a.pct - b.pct)[0];
    if (worst.pct < 0.6) out.push(`${worst.habit.name} has been the hardest to keep up this month (${pct(worst.pct)}). A smaller version might help it stick.`);
  }
  const wd = weekdayPerformance(ctx, habits, today).filter((w) => w.scheduled >= 6);
  if (wd.length >= 4) {
    const top = [...wd].sort((a, b) => b.pct - a.pct)[0];
    const avg = wd.reduce((a, w) => a + w.pct, 0) / wd.length;
    if (top.pct - avg > 0.03) out.push(`You complete more habits on ${WEEKDAY_LONG[top.day]}s — ${pct(top.pct)} on average.`);
  }
  const cmp = periodCompare(ctx, habits, today, weekStart);
  if (cmp.lastWeek.scheduled >= 5 && cmp.thisWeek.scheduled >= 3) {
    const delta = Math.round((cmp.thisWeek.pct - cmp.lastWeek.pct) * 100);
    if (delta > 0) out.push(`Your weekly consistency improved by ${delta}% compared with last week.`);
    else if (delta < 0) out.push(`This week is running ${Math.abs(delta)}% below last week. There’s still time to turn it around.`);
    else out.push('Your consistency this week is matching last week exactly.');
  }
  const active = habits.filter((h) => ctx.streak(h) >= 2).length;
  if (active >= 1) out.push(`You’re maintaining ${active === 1 ? 'one active streak' : `${numberWord(active)} active streaks`}.`);
  const refl = reflectionStreaks(reflections, today);
  if (refl.current >= 3) out.push(`You’ve reflected ${refl.current} days in a row.`);

  const m = moodStats(moods, from30, today);
  if (m.total >= 7) {
    // Compare habit completion on good-mood days vs. others.
    const good = moods.filter((x) => x.date >= from30 && x.mood >= 4).map((x) => ctx.day(habits, x.date).pct);
    const rest = moods.filter((x) => x.date >= from30 && x.mood <= 3).map((x) => ctx.day(habits, x.date).pct);
    if (good.length >= 3 && rest.length >= 3) {
      const g = good.reduce((a, b) => a + b, 0) / good.length;
      const r = rest.reduce((a, b) => a + b, 0) / rest.length;
      if (g - r > 0.08) out.push(`On days you feel good or amazing, you complete ${pct(g)} of habits versus ${pct(r)} on other days.`);
    }
  }
  const sl = sleepStats(sleep, addDays(today, -13), today);
  if (sl.count >= 5) out.push(`You’ve averaged ${Math.floor(sl.avg / 60)}h ${Math.round(sl.avg % 60)}m of sleep over the last two weeks.`);
  return out;
}

function numberWord(n: number) {
  return ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] ?? String(n);
}
