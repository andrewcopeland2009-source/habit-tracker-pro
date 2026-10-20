import { addDays, diffDays, maxKey, range, weekday, weekStartOf } from './date';
import type { Completion, DateKey, Habit, Schedule } from './types';

export const completionId = (habitId: string, date: DateKey) => `${habitId}|${date}`;

export type CompletionMap = Map<string, Completion>;

export function goalAmount(h: Habit) {
  return h.target && h.target.amount > 0 ? h.target.amount : 1;
}

/**
 * Evaluation context: wraps completions and memoises the per-week slot
 * assignment needed for "N times per week" habits.
 */
export class HabitCtx {
  private weekCache = new Map<string, Set<DateKey>>();
  constructor(
    readonly completions: CompletionMap,
    readonly weekStart: number,
    readonly today: DateKey,
  ) {}

  value(h: Habit, date: DateKey) {
    return this.completions.get(completionId(h.id, date))?.value ?? 0;
  }

  done(h: Habit, date: DateKey) {
    return this.value(h, date) >= goalAmount(h);
  }

  /** Is the habit expected on this date? */
  due(h: Habit, date: DateKey): boolean {
    if (date < h.startDate) return false;
    const s = h.schedule;
    switch (s.kind) {
      case 'daily':
        return true;
      case 'weekdays':
        return s.days.includes(weekday(date));
      case 'interval':
        return diffDays(h.startDate, date) % Math.max(1, s.every) === 0;
      case 'timesPerWeek':
        return this.weeklyDue(h, s.times, date);
    }
  }

  /**
   * For flexible weekly habits, completed days are always "due". Any shortfall
   * against the weekly target is assigned to the latest open days of the week,
   * so a day only counts as missed once the target could no longer be met
   * without it.
   */
  private weeklyDue(h: Habit, times: number, date: DateKey) {
    const ws = weekStartOf(date, this.weekStart);
    const key = `${h.id}|${ws}`;
    let due = this.weekCache.get(key);
    if (!due) {
      const days = range(maxKey(ws, h.startDate), addDays(ws, 6));
      const doneDays = days.filter((d) => this.done(h, d));
      const open = days.filter((d) => !this.done(h, d));
      const needed = Math.max(0, times - doneDays.length);
      due = new Set([...doneDays, ...open.slice(Math.max(0, open.length - needed))]);
      this.weekCache.set(key, due);
    }
    return due.has(date);
  }

  weekCount(h: Habit, date: DateKey) {
    const ws = weekStartOf(date, this.weekStart);
    let n = 0;
    for (let i = 0; i < 7; i++) if (this.done(h, addDays(ws, i))) n++;
    return n;
  }

  /** Flexible habit still open this week (shown in Today even if not yet due). */
  openThisWeek(h: Habit, date: DateKey) {
    return h.schedule.kind === 'timesPerWeek' && date >= h.startDate && this.weekCount(h, date) < h.schedule.times;
  }

  day(habits: Habit[], date: DateKey) {
    let scheduled = 0;
    let done = 0;
    for (const h of habits) {
      if (!this.due(h, date)) continue;
      scheduled++;
      if (this.done(h, date)) done++;
    }
    return { scheduled, done, pct: scheduled ? done / scheduled : 0 };
  }

  rangeStats(habits: Habit[], from: DateKey, to: DateKey) {
    let scheduled = 0;
    let done = 0;
    const end = to > this.today ? this.today : to;
    if (from <= end) {
      for (const d of range(from, end)) {
        const s = this.day(habits, d);
        scheduled += s.scheduled;
        done += s.done;
      }
    }
    return { scheduled, done, pct: scheduled ? done / scheduled : 0 };
  }

  habitRate(h: Habit, from: DateKey, to: DateKey) {
    const start = maxKey(from, h.startDate);
    const end = to > this.today ? this.today : to;
    let due = 0;
    let done = 0;
    if (start <= end) {
      for (const d of range(start, end)) {
        if (!this.due(h, d)) continue;
        due++;
        if (this.done(h, d)) done++;
      }
    }
    return { due, done, pct: due ? done / due : 0 };
  }

  /** Current streak. Unit is days, or weeks for flexible weekly habits. */
  streak(h: Habit): number {
    if (h.schedule.kind === 'timesPerWeek') return this.weekStreak(h, h.schedule.times).current;
    let n = 0;
    let d = this.today;
    for (let i = 0; i < 3660 && d >= h.startDate; i++, d = addDays(d, -1)) {
      if (!this.due(h, d)) continue;
      if (this.done(h, d)) n++;
      else if (d !== this.today) break;
    }
    return n;
  }

  longestStreak(h: Habit): number {
    if (h.schedule.kind === 'timesPerWeek') return this.weekStreak(h, h.schedule.times).longest;
    if (h.startDate > this.today) return 0;
    let best = 0;
    let run = 0;
    for (const d of range(h.startDate, this.today)) {
      if (!this.due(h, d)) continue;
      if (this.done(h, d)) best = Math.max(best, ++run);
      else if (d !== this.today) run = 0;
    }
    return best;
  }

  private weekStreak(h: Habit, times: number) {
    const first = weekStartOf(h.startDate, this.weekStart);
    const current = weekStartOf(this.today, this.weekStart);
    let best = 0;
    let run = 0;
    for (let ws = first; ws <= current; ws = addDays(ws, 7)) {
      const ok = this.weekCount(h, ws) >= times;
      if (ok) best = Math.max(best, ++run);
      else if (ws !== current) run = 0;
    }
    return { current: run, longest: best };
  }

  /** Consecutive days on which every scheduled habit was completed. */
  perfectDayStreak(habits: Habit[]): number {
    if (!habits.length) return 0;
    const earliest = habits.reduce((m, h) => (h.startDate < m ? h.startDate : m), this.today);
    let n = 0;
    for (let d = this.today, i = 0; d >= earliest && i < 3660; d = addDays(d, -1), i++) {
      const s = this.day(habits, d);
      if (!s.scheduled) continue;
      if (s.done === s.scheduled) n++;
      else if (d !== this.today) break;
    }
    return n;
  }

  longestPerfectStreak(habits: Habit[]): number {
    if (!habits.length) return 0;
    const earliest = habits.reduce((m, h) => (h.startDate < m ? h.startDate : m), this.today);
    let best = 0;
    let run = 0;
    for (const d of range(earliest, this.today)) {
      const s = this.day(habits, d);
      if (!s.scheduled) continue;
      if (s.done === s.scheduled) best = Math.max(best, ++run);
      else if (d !== this.today) run = 0;
    }
    return best;
  }
}

export function streakUnit(h: Habit) {
  return h.schedule.kind === 'timesPerWeek' ? 'wk' : 'd';
}

export function describeSchedule(s: Schedule): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  switch (s.kind) {
    case 'daily':
      return 'Every day';
    case 'weekdays': {
      const days = [...s.days].sort();
      if (days.length === 7) return 'Every day';
      if (days.join() === '1,2,3,4,5') return 'Weekdays';
      if (days.join() === '0,6') return 'Weekends';
      return days.map((d) => names[d]).join(' · ');
    }
    case 'timesPerWeek':
      return `${s.times}× per week`;
    case 'interval':
      return s.every === 1 ? 'Every day' : `Every ${s.every} days`;
  }
}
