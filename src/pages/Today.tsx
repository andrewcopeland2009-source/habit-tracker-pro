import { motion } from 'framer-motion';
import { BookHeart, CalendarDays, Flame, Minus, NotebookPen, Plus, Settings, Settings2, Target } from 'lucide-react';
import { useMemo } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { HabitIcon } from '../components/HabitIcon';
import { EmptyState, IconButton, PageHeader, Panel, SectionHeader } from '../components/ui';
import { Blossom, CheckCircle, NotebookArt, ProgressRing, Sprig } from '../components/visuals';
import { WEEKDAY_SHORT, addDays, diffDays, greeting, longDate, range, weekday } from '../lib/date';
import { MOTIVATION } from '../lib/defaults';
import { goalAmount, streakUnit } from '../lib/habits';
import { barColor, swatch } from '../lib/palette';
import type { Habit } from '../lib/types';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';
import { MoodPicker } from '../features/MoodPicker';
import { SleepCard, WaterCard } from '../features/Wellness';
import { reflectionStreaks } from '../lib/insights';

export function HabitRow({ h, index }: { h: Habit; index: number }) {
  const { ctx, today, dark, toggleHabit, setHabitValue, categories, habits } = useStore();
  const { celebrate } = useUI();
  const c = swatch(h.color, dark);
  const value = ctx.value(h, today);
  const goal = goalAmount(h);
  const done = value >= goal;
  const streak = ctx.streak(h);
  const cat = categories.get(h.categoryId);
  const weekly = h.schedule.kind === 'timesPerWeek' ? `${ctx.weekCount(h, today)}/${h.schedule.times} this week` : null;

  const afterChange = (willBeDone: boolean) => {
    if (!willBeDone) return;
    // Celebrate when this completion finishes the day.
    const others = habits.filter((x) => x.id !== h.id && ctx.due(x, today));
    if (others.every((x) => ctx.done(x, today))) celebrate();
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-line/70 bg-card py-2.5 pl-3.5 pr-2.5"
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: c.mid }} />
      <motion.span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
        animate={{ background: done ? c.mid : c.fill }}
        style={{ color: c.ink }}
      >
        <HabitIcon name={h.icon} size={18} />
      </motion.span>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-[14.5px] font-semibold transition ${done ? 'text-muted line-through decoration-1' : ''}`}>{h.name}</div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted">
          {cat && (
            <span className="chip !px-1.5 !py-0 !text-[10px]" style={{ background: swatch(cat.color, dark).fill, color: swatch(cat.color, dark).ink }}>
              {cat.name}
            </span>
          )}
          {h.target && (
            <span className="tabular">
              {value}/{goal} {h.target.unit}
            </span>
          )}
          {weekly && <span>{weekly}</span>}
        </div>
      </div>
      {streak > 0 && (
        <span className="tabular flex items-center gap-0.5 rounded-full bg-peach/40 px-1.5 py-0.5 text-[11px] font-bold text-ink/80" title="Current streak">
          <Flame size={11} className="text-[#e07a4f]" />
          {streak}
          <span className="font-medium opacity-70">{streakUnit(h)}</span>
        </span>
      )}
      {h.target && goal > 1 && !done && (
        <div className="flex items-center gap-0.5">
          <button type="button" aria-label={`Decrease ${h.name}`} disabled={value <= 0} onClick={() => setHabitValue(h, today, Math.max(0, value - 1))} className="grid h-7 w-7 place-items-center rounded-full bg-sunk text-muted disabled:opacity-30">
            <Minus size={13} />
          </button>
          <button
            type="button"
            aria-label={`Increase ${h.name}`}
            onClick={() => {
              void setHabitValue(h, today, value + 1);
              afterChange(value + 1 >= goal);
            }}
            className="grid h-7 w-7 place-items-center rounded-full"
            style={{ background: c.fill, color: c.ink }}
          >
            <Plus size={13} />
          </button>
        </div>
      )}
      <CheckCircle
        checked={done}
        partial={value / goal}
        color={c.mid}
        ink={c.ink}
        label={`Mark ${h.name} ${done ? 'not done' : 'done'}`}
        onClick={async () => afterChange(await toggleHabit(h, today))}
      />
    </motion.li>
  );
}

export function Today() {
  const { prefs, today, ctx, habits, reflectionsByDate, data, dark } = useStore();
  const ui = useUI();
  const stats = ctx.day(habits, today);
  const due = habits.filter((h) => ctx.due(h, today));
  const flexible = habits.filter((h) => !ctx.due(h, today) && ctx.openThisWeek(h, today));
  const streak = ctx.perfectDayStreak(habits);
  const reflection = reflectionsByDate.get(today);
  const reflected = reflection?.status === 'complete';
  const refStreak = useMemo(() => reflectionStreaks(data.reflections, today).current, [data.reflections, today]);
  const motivation = MOTIVATION[Math.abs(diffDays('2024-01-01', today)) % MOTIVATION.length];
  const greet = greeting();

  const week = range(addDays(today, -6), today).map((d) => {
    const s = ctx.day(habits, d);
    return { d, label: WEEKDAY_SHORT[weekday(d)].slice(0, 2), pct: Math.round(s.pct * 100), raw: s };
  });

  const byCategory = useMemo(() => {
    const m = new Map<string, { done: number; total: number }>();
    for (const h of due) {
      const e = m.get(h.categoryId) ?? { done: 0, total: 0 };
      e.total++;
      if (ctx.done(h, today)) e.done++;
      m.set(h.categoryId, e);
    }
    return [...m.entries()];
  }, [due, ctx, today]);

  const pinned = reflection?.reminders.find((r, i) => reflection.favorites[i] && r.trim()) ?? reflection?.reminders.find((r) => r.trim());

  return (
    <div className="pb-nav">
      <PageHeader
        kicker={longDate(today)}
        title={prefs.name ? `${greet.replace('.', '')}, ${prefs.name}.` : greet}
        right={
          <IconButton label="Settings" onClick={ui.openSettings}>
            <Settings size={17} />
          </IconButton>
        }
      >
        <p className="mt-1.5 font-serif text-[14px] italic text-muted">{motivation}</p>
        <Sprig className="pointer-events-none absolute -top-1 right-14 h-12 w-12 opacity-60" />
      </PageHeader>

      <div className="space-y-3.5 px-4">
        {!reflected && (
          <motion.button
            type="button"
            onClick={ui.resumeReflection}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full items-center gap-3 rounded-2xl border border-blush bg-blush/30 p-3 text-left"
          >
            <NotebookPen size={20} className="shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Today’s reflection is waiting</div>
              <div className="text-[12px] text-muted">{reflection ? 'Your draft is saved — pick up where you left off.' : 'Three gratitudes, two reminders. A few quiet minutes.'}</div>
            </div>
            <span className="text-sm font-semibold text-accent">Begin →</span>
          </motion.button>
        )}

        {/* Summary */}
        <Panel className="paper-grid relative overflow-hidden p-4">
          <Blossom className="pointer-events-none absolute -bottom-3 -right-3 h-14 w-14 opacity-50" />
          <div className="flex items-center gap-4">
            <ProgressRing value={stats.pct} size={108} stroke={11} color={barColor(stats.pct, dark)} label={`${Math.round(stats.pct * 100)}% of today's habits complete`}>
              <div>
                <div className="tabular font-serif text-[28px] font-semibold leading-none">{Math.round(stats.pct * 100)}<span className="text-sm">%</span></div>
                <div className="label-xs mt-0.5 !text-[8.5px]">today</div>
              </div>
            </ProgressRing>
            <div className="grid flex-1 grid-cols-2 gap-1.5">
              <MiniStat label="Day streak" value={streak} sub={streak === 1 ? 'perfect day' : 'perfect days'} tint="rgb(var(--peach) / 0.35)" />
              <MiniStat label="Completed" value={stats.done} sub={`of ${stats.scheduled}`} tint="rgb(var(--sage) / 0.35)" />
              <MiniStat label="Remaining" value={stats.scheduled - stats.done} sub={stats.scheduled - stats.done === 0 && stats.scheduled ? 'all done ✿' : 'to go'} tint="rgb(var(--powder) / 0.35)" />
              <MiniStat label="Reflections" value={refStreak} sub="day streak" tint="rgb(var(--lavender) / 0.35)" />
            </div>
          </div>
        </Panel>

        {/* Habits */}
        <section>
          <SectionHeader
            kicker={`${due.length} scheduled`}
            title="Today’s habits"
            action={
              <div className="flex gap-1">
                <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={ui.manageHabits} aria-label="Manage habits">
                  <Settings2 size={14} /> Manage
                </button>
                <button type="button" className="btn-soft !px-2.5 !py-1 text-xs" onClick={() => ui.editHabit()}>
                  <Plus size={14} /> Add
                </button>
              </div>
            }
          />
          {!habits.length ? (
            <Panel>
              <EmptyState
                art={<NotebookArt className="h-24 w-28" />}
                title="A blank page"
                message="Add your first habit — something small you’d like to do more often."
                action={
                  <button type="button" className="btn-primary" onClick={() => ui.editHabit()}>
                    <Plus size={16} /> Add a habit
                  </button>
                }
              />
            </Panel>
          ) : !due.length && !flexible.length ? (
            <Panel className="p-5 text-center text-sm text-muted">Nothing scheduled today. Enjoy the breathing room.</Panel>
          ) : (
            <ul className="space-y-1.5">
              {due.map((h, i) => (
                <HabitRow key={h.id} h={h} index={i} />
              ))}
            </ul>
          )}
          {flexible.length > 0 && (
            <>
              <div className="label-xs mb-1.5 mt-3">Flexible · any day this week</div>
              <ul className="space-y-1.5">
                {flexible.map((h, i) => (
                  <HabitRow key={h.id} h={h} index={i} />
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Daily progress */}
        {habits.length > 0 && (
          <Panel className="p-3.5">
            <SectionHeader kicker="Progress" title="Your last seven days" />
            <div className="h-[110px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={week} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} />
                  <Tooltip
                    cursor={{ fill: 'rgb(var(--sunk))' }}
                    content={({ active, payload }) =>
                      active && payload?.[0] ? (
                        <div className="rounded-lg border border-line bg-card px-2 py-1 text-[11px] shadow-soft">
                          {payload[0].payload.raw.done}/{payload[0].payload.raw.scheduled} · {payload[0].payload.pct}%
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="pct" radius={[6, 6, 3, 3]} isAnimationActive>
                    {week.map((w) => (
                      <Cell key={w.d} fill={barColor(w.pct / 100, dark)} fillOpacity={w.d === today ? 1 : 0.7} stroke={w.d === today ? 'rgb(var(--ink))' : 'none'} strokeOpacity={0.25} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {byCategory.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line/70 pt-2.5">
                {byCategory.map(([id, v]) => {
                  const cat = data.categories.find((c) => c.id === id);
                  const s = swatch(cat?.color ?? 'stone', dark);
                  return (
                    <span key={id} className="chip tabular" style={{ background: s.fill, color: s.ink }}>
                      {cat?.name ?? 'Other'} {v.done}/{v.total}
                    </span>
                  );
                })}
              </div>
            )}
          </Panel>
        )}

        {/* Mood */}
        <Panel className="p-3.5">
          <SectionHeader kicker="Check-in" title="How are you feeling?" />
          <MoodPicker date={today} />
        </Panel>

        {/* Water & sleep */}
        <div className="grid grid-cols-1 gap-3.5 min-[400px]:grid-cols-2">
          <WaterCard date={today} />
          <SleepCard date={today} />
        </div>

        {/* Reflection preview */}
        {reflected && (
          <button type="button" onClick={() => ui.openReflection(today)} className="panel relative block w-full overflow-hidden p-4 text-left">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-blush via-peach to-butter" />
            <div className="label-xs">A reminder from this morning</div>
            <p className="mt-1.5 font-hand text-[26px] leading-tight">“{pinned}”</p>
            <div className="mt-2 text-xs font-semibold text-accent">Read today’s full reflection →</div>
          </button>
        )}

        {/* Quick actions */}
        <section>
          <SectionHeader title="Quick actions" />
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Add habit', Icon: Plus, tint: 'bg-sage/40', on: () => ui.editHabit() },
              { label: 'Add goal', Icon: Target, tint: 'bg-peach/40', on: () => ui.editGoal() },
              { label: 'Journal', Icon: BookHeart, tint: 'bg-blush/40', on: () => ui.setTab('journal') },
              { label: 'Calendar', Icon: CalendarDays, tint: 'bg-powder/40', on: () => ui.setTab('calendar') },
            ].map(({ label, Icon, tint, on }) => (
              <motion.button key={label} type="button" whileTap={{ scale: 0.94 }} onClick={on} className="panel flex flex-col items-center gap-1.5 px-1 py-3">
                <span className={`grid h-9 w-9 place-items-center rounded-full ${tint}`}>
                  <Icon size={17} />
                </span>
                <span className="text-[11px] font-semibold">{label}</span>
              </motion.button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function MiniStat({ label, value, sub, tint }: { label: string; value: number; sub: string; tint: string }) {
  return (
    <div className="rounded-xl px-2.5 py-1.5" style={{ background: tint }}>
      <div className="label-xs truncate !text-[8.5px]">{label}</div>
      <div className="tabular font-serif text-xl font-semibold leading-tight">{value}</div>
      <div className="truncate text-[10px] text-muted">{sub}</div>
    </div>
  );
}
