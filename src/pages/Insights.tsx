import { Award, CalendarCheck, Flame, Lightbulb, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChartTip, axisProps, gridStroke } from '../components/charts';
import { HabitIcon } from '../components/HabitIcon';
import { EmptyState, PageHeader, Panel, SectionHeader, Segmented } from '../components/ui';
import { ProgressRing, SunArt } from '../components/visuals';
import { WEEKDAY_LETTER, WEEKDAY_LONG, addDays, monthStart, parseKey, range, shortDate, weekStartOf } from '../lib/date';
import { streakUnit } from '../lib/habits';
import {
  buildInsights, earliestStart, goalCompletion, habitScores, periodCompare, reflectionConsistency, weekdayPerformance,
} from '../lib/insights';
import { barColor, intensityColor, swatch } from '../lib/palette';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';
import { MoodInsights, SleepInsights, WaterInsights } from './Wellbeing';

type View = 'habits' | 'mood' | 'sleep' | 'water';

export function Insights() {
  const [view, setView] = useState<View>('habits');
  return (
    <div className="pb-nav">
      <PageHeader kicker="Analytics" title="Insights">
        <Segmented<View>
          className="mt-3"
          value={view}
          onChange={setView}
          options={[
            { value: 'habits', label: 'Habits' },
            { value: 'mood', label: 'Mood' },
            { value: 'sleep', label: 'Sleep' },
            { value: 'water', label: 'Water' },
          ]}
        />
      </PageHeader>
      <div className="px-4">
        {view === 'habits' && <HabitInsights />}
        {view === 'mood' && <MoodInsights />}
        {view === 'sleep' && <SleepInsights />}
        {view === 'water' && <WaterInsights />}
      </div>
    </div>
  );
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const signed = (n: number) => `${n > 0 ? '+' : ''}${Math.round(n * 100)}%`;

function HabitInsights() {
  const { habits, ctx, today, prefs, data, dark, categories } = useStore();
  const ui = useUI();

  const a = useMemo(() => {
    const first = earliestStart(habits, today);
    const from30 = addDays(today, -29);
    const cmp = periodCompare(ctx, habits, today, prefs.weekStart);
    const scores30 = habitScores(ctx, habits, from30, today);
    const consistency = scores30.filter((s) => s.due).reduce((acc, s, _, arr) => acc + s.pct / arr.length, 0);
    const goals = goalCompletion(data.goals);
    const refl = reflectionConsistency(data.reflections, today, first > from30 ? first : from30);

    const daily = range(from30, today).map((d) => {
      const s = ctx.day(habits, d);
      return { d, label: String(parseKey(d).d), ...s };
    });
    const withSched = daily.filter((x) => x.scheduled);
    const avgDaily = withSched.length ? withSched.reduce((acc, x) => acc + x.pct, 0) / withSched.length : 0;

    const ws = weekStartOf(today, prefs.weekStart);
    const weekly = Array.from({ length: 12 }, (_, i) => {
      const s = addDays(ws, -7 * (11 - i));
      const r = ctx.rangeStats(habits, s, addDays(s, 6));
      return { label: shortDate(s), pct: Math.round(r.pct * 100), scheduled: r.scheduled, done: r.done };
    }).filter((w) => w.scheduled > 0);

    const monthRange = ctx.rangeStats(habits, monthStart(today), today);

    const catMap = new Map<string, { due: number; done: number }>();
    for (const s of scores30) {
      const e = catMap.get(s.habit.categoryId) ?? { due: 0, done: 0 };
      e.due += s.due;
      e.done += s.done;
      catMap.set(s.habit.categoryId, e);
    }
    const cats = [...catMap.entries()]
      .filter(([, v]) => v.due)
      .map(([id, v]) => ({ id, name: categories.get(id)?.name ?? 'Other', color: categories.get(id)?.color ?? 'stone', pct: Math.round((v.done / v.due) * 100) }))
      .sort((x, y) => y.pct - x.pct);

    const ranked = scores30.filter((s) => s.due >= 3).sort((x, y) => y.pct - x.pct);
    const wd = weekdayPerformance(ctx, habits, today).filter((w) => w.scheduled > 0);
    const bestDay = wd.length ? [...wd].sort((x, y) => y.pct - x.pct)[0] : null;
    const totalDone = data.completions.filter((c) => {
      const h = data.habits.find((x) => x.id === c.habitId);
      return h && c.value >= (h.target?.amount ?? 1);
    }).length;
    const streaks = habits.map((h) => ({ h, cur: ctx.streak(h), best: ctx.longestStreak(h) })).sort((x, y) => y.cur - x.cur);

    return {
      cmp, consistency, goals, refl, daily, avgDaily, weekly, monthRange, cats, ranked, bestDay, wd, totalDone, streaks,
      perfect: ctx.perfectDayStreak(habits), perfectBest: ctx.longestPerfectStreak(habits),
      insights: buildInsights({ ctx, habits, today, weekStart: prefs.weekStart, reflections: data.reflections, moods: data.moods, sleep: data.sleep }),
    };
  }, [habits, ctx, today, prefs.weekStart, data, categories]);

  if (!habits.length) {
    return (
      <Panel>
        <EmptyState art={<SunArt className="h-20 w-32" />} title="Nothing to analyse yet" message="Charts and insights appear once you start tracking habits." action={<button type="button" className="btn-primary" onClick={() => ui.editHabit()}>Add a habit</button>} />
      </Panel>
    );
  }

  const rings = [
    { label: 'Monthly', sub: 'completion', v: a.monthRange.pct, c: dark ? '#d39a72' : '#f6b48c' },
    { label: 'Weekly', sub: 'completion', v: a.cmp.thisWeek.pct, c: dark ? '#81a8cc' : '#9cc4e8' },
    { label: 'Habit', sub: 'consistency', v: a.consistency, c: dark ? '#8fb385' : '#a9cc9f' },
    { label: 'Goals', sub: 'completed', v: a.goals.pct, c: dark ? '#d2bb6c' : '#f1d475' },
    { label: 'Reflection', sub: 'consistency', v: a.refl.pct, c: dark ? '#a491c6' : '#bea9e3' },
  ];
  const donut = [
    { name: 'Completed', value: a.monthRange.done, fill: dark ? '#8fb385' : '#a9cc9f' },
    { name: 'Missed', value: Math.max(0, a.monthRange.scheduled - a.monthRange.done), fill: dark ? '#c98592' : '#f2a9b4' },
  ];
  const weekDelta = a.cmp.lastWeek.scheduled ? a.cmp.thisWeek.pct - a.cmp.lastWeek.pct : null;
  const monthDelta = a.cmp.lastMonth.scheduled ? a.cmp.thisMonth.pct - a.cmp.lastMonth.pct : null;

  return (
    <div className="space-y-3.5">
      {/* Rings */}
      <Panel className="paper-grid p-3">
        <div className="grid grid-cols-5 gap-1">
          {rings.map((r) => (
            <div key={r.label} className="flex flex-col items-center text-center">
              <ProgressRing value={r.v} size={58} stroke={6} color={r.c} label={`${r.label} ${r.sub} ${pct(r.v)}`}>
                <span className="tabular text-[12px] font-bold">{pct(r.v)}</span>
              </ProgressRing>
              <div className="mt-1 text-[10px] font-semibold leading-tight">{r.label}</div>
              <div className="text-[9px] leading-tight text-muted">{r.sub}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Insights */}
      <Panel className="p-3.5">
        <SectionHeader kicker="Observations" title="What your data says" />
        {a.insights.length ? (
          <ul className="space-y-2">
            {a.insights.map((s, i) => (
              <li key={i} className="flex gap-2.5 rounded-xl bg-butter/25 px-3 py-2 text-[13px] leading-snug">
                <Lightbulb size={15} className="mt-0.5 shrink-0 text-[#c9a227]" />
                {s}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl bg-sunk px-3 py-3 text-[13px] leading-relaxed text-muted">
            Keep tracking for about a week and personalised insights will start to appear here. Every observation is based only on what you’ve recorded.
          </p>
        )}
      </Panel>

      {/* Stats table */}
      <Panel className="overflow-hidden">
        <div className="border-b border-line px-3.5 pt-3.5"><SectionHeader kicker="Statistics" title="The numbers" /></div>
        <dl className="grid grid-cols-2 text-[12px]">
          {[
            ['Total habits completed', a.totalDone.toLocaleString()],
            ['Average daily completion', pct(a.avgDaily), 'last 30 days'],
            ['Best performing habit', a.ranked[0]?.habit.name ?? '—', a.ranked[0] ? pct(a.ranked[0].pct) : ''],
            ['Least consistent habit', a.ranked.length > 1 ? a.ranked[a.ranked.length - 1].habit.name : '—', a.ranked.length > 1 ? pct(a.ranked[a.ranked.length - 1].pct) : ''],
            ['Most productive weekday', a.bestDay ? WEEKDAY_LONG[a.bestDay.day] : '—', a.bestDay ? pct(a.bestDay.pct) : ''],
            ['Active streaks', String(a.streaks.filter((s) => s.cur > 0).length), 'habits'],
            ['Longest streak', String(Math.max(0, ...a.streaks.map((s) => s.best))), a.streaks.length ? [...a.streaks].sort((x, y) => y.best - x.best)[0].h.name : ''],
            ['Perfect-day streak', `${a.perfect}`, `best ${a.perfectBest}`],
            ['Weekly improvement', weekDelta === null ? '—' : signed(weekDelta), 'vs last week'],
            ['Monthly improvement', monthDelta === null ? '—' : signed(monthDelta), 'vs last month'],
          ].map(([k, v, sub], i) => (
            <div key={k} className={`border-line px-3.5 py-2.5 ${i % 2 ? 'border-l' : ''} ${i > 1 ? 'border-t' : ''} ${Math.floor(i / 2) % 2 ? 'bg-sunk/40' : ''}`}>
              <dt className="label-xs !text-[8.5px]">{k}</dt>
              <dd className="mt-0.5 flex items-baseline gap-1.5">
                <span className="truncate font-serif text-[15px] font-semibold">{v}</span>
                {sub && <span className="truncate text-[10px] text-muted">{sub}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </Panel>

      {/* Daily completion */}
      <Panel className="p-3.5">
        <SectionHeader kicker="Last 30 days" title="Daily completion" />
        <div className="h-[150px]">
          <ResponsiveContainer>
            <BarChart data={a.daily} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="2 4" />
              <XAxis dataKey="label" {...axisProps} interval={4} />
              <YAxis {...axisProps} domain={[0, 1]} ticks={[0, 0.5, 1]} tickFormatter={(v) => `${v * 100}`} />
              <Tooltip cursor={{ fill: 'rgb(var(--sunk))' }} content={<ChartTip render={(p) => `${shortDate(p.d)} · ${p.done}/${p.scheduled} · ${pct(p.pct)}`} />} />
              <Bar dataKey="pct" radius={[4, 4, 1, 1]}>
                {a.daily.map((x) => (
                  <Cell key={x.d} fill={barColor(x.pct, dark)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid gap-3.5 sm:grid-cols-2">
        {/* Weekly trend */}
        <Panel className="p-3.5">
          <SectionHeader kicker="12 weeks" title="Weekly trend" />
          {a.weekly.length >= 2 ? (
            <div className="h-[140px]">
              <ResponsiveContainer>
                <AreaChart data={a.weekly} margin={{ top: 6, right: 6, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wk" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor={dark ? '#a491c6' : '#bea9e3'} stopOpacity={0.55} />
                      <stop offset="1" stopColor={dark ? '#a491c6' : '#bea9e3'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="2 4" />
                  <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
                  <YAxis {...axisProps} domain={[0, 100]} ticks={[0, 50, 100]} />
                  <Tooltip content={<ChartTip render={(p) => `Week of ${p.label} · ${p.pct}%`} />} />
                  <Area type="monotone" dataKey="pct" stroke={dark ? '#a491c6' : '#9c84cf'} strokeWidth={2.2} fill="url(#wk)" dot={{ r: 2.5, fill: dark ? '#a491c6' : '#9c84cf' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-muted">Two weeks of data are needed for a trend line.</p>
          )}
        </Panel>

        {/* Distribution */}
        <Panel className="p-3.5">
          <SectionHeader kicker="This month" title="Habit distribution" />
          {a.monthRange.scheduled ? (
            <div className="flex items-center gap-3">
              <div className="relative h-[130px] w-[130px] shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={donut} dataKey="value" innerRadius={40} outerRadius={60} paddingAngle={3} cornerRadius={6} stroke="none">
                      {donut.map((d) => <Cell key={d.name} fill={d.fill} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div>
                    <div className="tabular font-serif text-xl font-semibold leading-none">{pct(a.monthRange.pct)}</div>
                    <div className="text-[9px] text-muted">done</div>
                  </div>
                </div>
              </div>
              <ul className="space-y-2 text-xs">
                {donut.map((d) => (
                  <li key={d.name} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded" style={{ background: d.fill }} />
                    <span className="font-semibold">{d.name}</span>
                    <span className="tabular text-muted">{d.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-muted">No scheduled habits this month yet.</p>
          )}
        </Panel>
      </div>

      {/* Categories */}
      <Panel className="p-3.5">
        <SectionHeader kicker="Last 30 days" title="Category performance" />
        <div className="space-y-2">
          {a.cats.map((c) => {
            const s = swatch(c.color, dark);
            return (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <span className="w-[86px] shrink-0 truncate font-semibold">{c.name}</span>
                <div className="h-4 flex-1 overflow-hidden rounded-md bg-sunk">
                  <div className="h-full rounded-md transition-all duration-700" style={{ width: `${c.pct}%`, background: `linear-gradient(90deg, ${s.fill}, ${s.mid})` }} />
                </div>
                <span className="tabular w-9 text-right font-semibold">{c.pct}%</span>
              </div>
            );
          })}
          {!a.cats.length && <p className="text-xs text-muted">No category data yet.</p>}
        </div>
      </Panel>

      {/* Heatmap */}
      <ConsistencyHeatmap />

      {/* Weekday */}
      {a.wd.length > 0 && (
        <Panel className="p-3.5">
          <SectionHeader kicker="Last 90 days" title="By weekday" />
          <div className="flex h-24 items-end gap-2">
            {Array.from({ length: 7 }, (_, i) => (i + prefs.weekStart) % 7).map((day) => {
              const w = a.wd.find((x) => x.day === day);
              const v = w?.pct ?? 0;
              return (
                <div key={day} className="flex flex-1 flex-col items-center gap-1">
                  <span className="tabular text-[9px] text-muted">{w ? Math.round(v * 100) : '–'}</span>
                  <div className="w-full rounded-t-md" style={{ height: `${Math.max(4, v * 64)}px`, background: barColor(v, dark) }} />
                  <span className="text-[10px] font-semibold text-muted">{WEEKDAY_LETTER[day]}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Streaks */}
      <Panel className="p-3.5">
        <SectionHeader kicker="Momentum" title="Streak analytics" />
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-peach/35 p-2.5">
            <Flame size={20} className="text-[#e07a4f]" />
            <div>
              <div className="tabular font-serif text-xl font-semibold leading-none">{a.perfect}</div>
              <div className="text-[10px] text-muted">current perfect days</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-butter/40 p-2.5">
            <Award size={20} className="text-[#c9a227]" />
            <div>
              <div className="tabular font-serif text-xl font-semibold leading-none">{a.perfectBest}</div>
              <div className="text-[10px] text-muted">longest perfect run</div>
            </div>
          </div>
        </div>
        <ul className="divide-y divide-line/70">
          {a.streaks.map(({ h, cur, best }) => {
            const c = swatch(h.color, dark);
            return (
              <li key={h.id} className="flex items-center gap-2.5 py-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: c.fill, color: c.ink }}>
                  <HabitIcon name={h.icon} size={14} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{h.name}</span>
                <span className="tabular flex items-center gap-0.5 text-xs font-bold"><Flame size={12} className="text-[#e07a4f]" />{cur}{streakUnit(h)}</span>
                <span className="tabular w-16 text-right text-[11px] text-muted">best {best}{streakUnit(h)}</span>
              </li>
            );
          })}
        </ul>
      </Panel>

      {/* Improvement */}
      <div className="grid grid-cols-2 gap-3.5">
        {[
          { k: 'This week vs last', d: weekDelta, now: a.cmp.thisWeek.pct },
          { k: 'This month vs last', d: monthDelta, now: a.cmp.thisMonth.pct },
        ].map(({ k, d, now }) => (
          <Panel key={k} className="p-3">
            <div className="label-xs !text-[9px]">{k}</div>
            <div className="mt-1 flex items-center gap-1.5">
              {d === null ? <CalendarCheck size={16} className="text-muted" /> : d >= 0 ? <TrendingUp size={16} className="text-[#6b9e5f]" /> : <TrendingDown size={16} className="text-coral" />}
              <span className="tabular font-serif text-xl font-semibold">{d === null ? pct(now) : signed(d)}</span>
            </div>
            <div className="text-[10px] text-muted">{d === null ? 'no earlier period yet' : `now at ${pct(now)}`}</div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function ConsistencyHeatmap() {
  const { ctx, habits, today, prefs, dark } = useStore();
  const weeks = 18;
  const end = addDays(weekStartOf(today, prefs.weekStart), 6);
  const start = addDays(end, -(weeks * 7 - 1));
  const cols = useMemo(
    () =>
      Array.from({ length: weeks }, (_, w) =>
        Array.from({ length: 7 }, (_, i) => {
          const d = addDays(start, w * 7 + i);
          if (d > today) return { d, v: -1 };
          const s = ctx.day(habits, d);
          return { d, v: s.scheduled ? s.pct : -2 };
        }),
      ),
    [ctx, habits, start, today],
  );
  return (
    <Panel className="p-3.5">
      <SectionHeader kicker={`${weeks} weeks`} title="Consistency heatmap" />
      <div className="flex gap-[3px]">
        <div className="mr-1 flex flex-col gap-[3px]">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="grid h-[14px] place-items-center text-[8px] font-semibold text-faint">{i % 2 === 0 ? WEEKDAY_LETTER[(i + prefs.weekStart) % 7] : ''}</span>
          ))}
        </div>
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-1 flex-col gap-[3px]">
            {col.map(({ d, v }) => (
              <span
                key={d}
                title={v >= 0 ? `${shortDate(d)}: ${Math.round(v * 100)}%` : shortDate(d)}
                className={`block h-[14px] rounded-[3px] ${d === today ? 'ring-1 ring-accent' : ''}`}
                style={{ background: v === -1 ? 'transparent' : v === -2 ? 'rgb(var(--sunk))' : intensityColor(v, dark), border: v === -1 ? '1px dashed rgb(var(--line))' : undefined }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
        <span>{shortDate(start)}</span>
        <span className="flex items-center gap-1">
          Less {[0, 0.2, 0.4, 0.6, 0.9, 1].map((p) => <span key={p} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: intensityColor(p, dark) }} />)} More
        </span>
      </div>
    </Panel>
  );
}

