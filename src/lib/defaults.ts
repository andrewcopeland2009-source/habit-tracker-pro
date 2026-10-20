import type { Category, Habit, Schedule } from './types';

export const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`).slice(0, 18);

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'health', name: 'Health', color: 'sage', builtIn: true },
  { id: 'fitness', name: 'Fitness', color: 'coral', builtIn: true },
  { id: 'productivity', name: 'Productivity', color: 'powder', builtIn: true },
  { id: 'learning', name: 'Learning', color: 'lavender', builtIn: true },
  { id: 'personal', name: 'Personal', color: 'blush', builtIn: true },
  { id: 'business', name: 'Business', color: 'butter', builtIn: true },
  { id: 'lifestyle', name: 'Lifestyle', color: 'peach', builtIn: true },
];

export interface HabitTemplate {
  name: string;
  description: string;
  icon: string;
  categoryId: string;
  color: string;
  schedule: Schedule;
  target?: { amount: number; unit: string };
}

export const HABIT_TEMPLATES: HabitTemplate[] = [
  { name: 'Drink water', description: 'Stay hydrated through the day', icon: 'droplet', categoryId: 'health', color: 'powder', schedule: { kind: 'daily' }, target: { amount: 8, unit: 'glasses' } },
  { name: 'Morning walk', description: 'Fresh air before the day begins', icon: 'footprints', categoryId: 'fitness', color: 'sage', schedule: { kind: 'daily' } },
  { name: 'Read', description: 'A few pages of something good', icon: 'book-open', categoryId: 'learning', color: 'lavender', schedule: { kind: 'daily' }, target: { amount: 20, unit: 'pages' } },
  { name: 'Workout', description: 'Move your body with intent', icon: 'dumbbell', categoryId: 'fitness', color: 'coral', schedule: { kind: 'timesPerWeek', times: 3 } },
  { name: 'Meditate', description: 'Ten quiet minutes', icon: 'flower', categoryId: 'health', color: 'mint', schedule: { kind: 'daily' } },
  { name: 'Deep work', description: 'One focused block, no notifications', icon: 'target', categoryId: 'productivity', color: 'butter', schedule: { kind: 'weekdays', days: [1, 2, 3, 4, 5] } },
  { name: 'No phone in bed', description: 'Screens off thirty minutes before sleep', icon: 'moon', categoryId: 'lifestyle', color: 'lavender', schedule: { kind: 'daily' } },
  { name: 'Journal', description: 'Write down one honest thought', icon: 'pen-line', categoryId: 'personal', color: 'blush', schedule: { kind: 'daily' } },
  { name: 'Stretch', description: 'Loosen up for five minutes', icon: 'sparkles', categoryId: 'fitness', color: 'peach', schedule: { kind: 'daily' } },
  { name: 'Learn a language', description: 'A short daily lesson', icon: 'languages', categoryId: 'learning', color: 'powder', schedule: { kind: 'daily' } },
  { name: 'Review finances', description: 'Check spending and plan ahead', icon: 'wallet', categoryId: 'business', color: 'butter', schedule: { kind: 'weekdays', days: [0] } },
  { name: 'Tidy up', description: 'Ten-minute reset of your space', icon: 'home', categoryId: 'lifestyle', color: 'peach', schedule: { kind: 'interval', every: 2 } },
  { name: 'Call someone you love', description: 'Stay connected', icon: 'phone', categoryId: 'personal', color: 'rose', schedule: { kind: 'timesPerWeek', times: 2 } },
  { name: 'Vitamins', description: 'Take daily supplements', icon: 'pill', categoryId: 'health', color: 'sage', schedule: { kind: 'daily' } },
];

export function habitFromTemplate(t: HabitTemplate, startDate: string, order: number): Habit {
  return {
    id: uid(),
    name: t.name,
    description: t.description,
    icon: t.icon,
    categoryId: t.categoryId,
    color: t.color,
    schedule: t.schedule,
    startDate,
    target: t.target,
    order,
    archived: false,
    createdAt: Date.now(),
  };
}

export const MOTIVATION = [
  'Small steps, taken often, become a path.',
  'You do not have to be perfect to be consistent.',
  'Show up gently. That counts.',
  'Progress is quiet. Keep going anyway.',
  'One good choice is enough to start.',
  'Make room for what matters today.',
  'Be the kind of steady you would admire.',
  'Today is a fresh page. Write a little.',
  'Rest is part of the rhythm, too.',
  'Done with care beats done with pressure.',
  'Your future self is built in ordinary moments.',
  'Notice what is going right.',
];
