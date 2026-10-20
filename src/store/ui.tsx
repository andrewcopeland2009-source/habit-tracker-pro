import { createContext, useContext } from 'react';
import type { DateKey, Goal, GoalPeriod, Habit } from '../lib/types';

export type Tab = 'today' | 'calendar' | 'insights' | 'journal' | 'goals';

export interface UI {
  tab: Tab;
  setTab: (t: Tab) => void;
  editHabit: (h?: Habit) => void;
  manageHabits: () => void;
  editGoal: (g?: Goal, period?: GoalPeriod) => void;
  openReflection: (date: DateKey) => void;
  resumeReflection: () => void;
  openSettings: () => void;
  celebrate: () => void;
}

export const UICtx = createContext<UI | null>(null);

export function useUI() {
  const u = useContext(UICtx);
  if (!u) throw new Error('useUI outside provider');
  return u;
}
