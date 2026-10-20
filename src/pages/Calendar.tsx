import { motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { HabitIcon } from '../components/HabitIcon';
import { EmptyState, PageHeader, Panel, SectionHeader } from '../components/ui';
import { NotebookArt, ProgressRing } from '../components/visuals';
import { WEEKDAY_LETTER, addMonths, monthDays, monthStart, monthTitle, parseKey, weekday } from '../lib/date';
import { goalAmount } from '../lib/habits';
import { barColor, intensityColor, swatch } from '../lib/palette';
import type { DateKey, Habit } from '../lib/types';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';

const COL = 28;

export function Calendar() {
  const { today, habits, ctx, dark, setHabitValue } = useStore();
  const ui = useUI();
  const [month, setMonth] = useState(() => monthStart(today));
  const days = useMemo(() => monthDays(month), [month]);
  const scroller = useRef<HTMLDivElement>(null);
  const isCurrent = month === monthStart(today);
  const monthEnd = days[days.length - 1];

  // Scroll today's column into view.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const idx = isCurrent ? parseKey(today).d - 1 : 0;
    el.scrollTo({ left: Math.max(0, idx * COL - el.clientWidth / 2 + 140), behavior: 'smooth' });
  }, [month, isCurrent, today]);

  const daily = days.map((d) => ({ d, ...ctx.day(habits, d), future: d > today }));
  const monthStats = ctx.rangeStats(habits, month, monthEnd);
  const perfect = daily.filter((x) => !x.future && x.scheduled && x.done === x.scheduled).length;
  const checkins = daily.reduce((a, x) => a + (x.future ? 0 : x.done), 0);

  const rows = habits.map((h) => {
    const r = ctx.habitRate(h, month, monthEnd);
    return { h, pct: r.pct, done: r.done, due: r.due, streak: ctx.streak(h), longest: ctx.longestStreak(h) };
  });

  const toggle = (h: Habit, d: DateKey) => {
    if (d > today || d < h.startDate) return;
    void setHabitValue(h, d, ctx.done(h, d) ? 0 : goalAmount(h));
  };

  const gridCols = `minmax(124px, 150px) repeat(${days.length}, ${COL}px)`;

  return (
    <div className="pb-nav">
      <PageHeader
        kicker="Monthly tracker"
        title={monthTitle(month)}
        right={
          <>
            <button type="button" className="btn-soft !px-2.5 !py-1.5 text-xs" disabled={isCurrent} onClick={() => setMonth(monthStart(today))}>
              Today
            </button>
            <button type="button" aria-label="Previous month" className="btn-soft !p-1.5" onClick={() => setMonth(addMonths(month, -1))}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" aria-label="Next month" className="btn-soft !p-1.5" onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight size={18} />
            </button>
          </>
        }
      />

      <div className="space-y-3.5 px-4">
        <Panel className="paper-grid flex items-center gap-3 p-3">
          <ProgressRing value={monthStats.pct} size={64} stroke={7} color={barColor(monthStats.pct, dark)}>
            <span className="tabular font-serif text-[15px] font-semibold">{Math.round(monthStats.pct * 100)}%</span>
          </ProgressRing>
          <div className="grid flex-1 grid-cols-3 gap-1.5 text-center">
            {[
              ['Check-ins', checkins, 'bg-sage/35'],
              ['Perfect days', perfect, 'bg-butter/40'],
              ['Scheduled', monthStats.scheduled, 'bg-powder/35'],
            ].map(([l, v, t]) => (
              <div key={l as string} className={`rounded-xl px-1 py-1.5 ${t}`}>
                <div className="tabular font-serif text-lg font-semibold leading-none">{v}</div>
                <div className="label-xs mt-0.5 !text-[8.5px]">{l}</div>
              </div>
            ))}
          </div>
        </Panel>

        {!habits.length ? (
          <Panel>
            <EmptyState
              art={<NotebookArt className="h-24 w-28" />}
              title="Your tracker is empty"
              message="Add habits and they’ll appear here as rows in a monthly spreadsheet."
              action={<button type="button" className="btn-primary" onClick={() => ui.editHabit()}><Plus size={16} /> Add a habit</button>}
            />
          </Panel>
        ) : (
          <div className="flex flex-col gap-3.5 lg:flex-row lg:items-start">
            {/* Spreadsheet */}
            <Panel className="min-w-0 flex-1 overflow-hidden">
              <div ref={scroller} className="no-scrollbar overflow-x-auto overscroll-x-contain">
                <div className="grid w-max" style={{ gridTemplateColumns: gridCols }}>
                  {/* Daily completion bars */}
                  <div className="sticky left-0 z-20 flex flex-col justify-end border-b border-r border-line bg-card px-3 pb-1.5">
                    <div className="label-xs !text-[9px]">Daily completion</div>
                  </div>
                  {daily.map((x) => (
                    <div key={x.d} className={`flex h-[72px] items-end justify-center border-b border-line/70 px-[5px] pb-1 ${x.d === today ? 'bg-blush/20' : ''}`}>
                      <motion.div
                        className="w-full rounded-t-[5px]"
                        initial={{ height: 0 }}
                        animate={{ height: x.future || !x.scheduled ? 3 : Math.max(4, x.pct * 60) }}
                        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                        style={{ background: x.future || !x.scheduled ? 'rgb(var(--line))' : barColor(x.pct, dark) }}
                        title={`${x.done}/${x.scheduled}`}
                      />
                    </div>
                  ))}

                  {/* Weekday + date header */}
                  <div className="sticky left-0 z-20 flex items-center border-b border-r border-line bg-sunk px-3 text-[11px] font-semibold text-muted">Habit</div>
                  {days.map((d) => {
                    const wd = weekday(d);
                    const isToday = d === today;
                    const weekend = wd === 0 || wd === 6;
                    return (
                      <div key={d} className={`flex flex-col items-center border-b border-line py-1 ${isToday ? 'bg-blush/40' : weekend ? 'bg-sunk' : 'bg-sunk/60'}`}>
                        <span className="text-[9px] font-semibold text-faint">{WEEKDAY_LETTER[wd]}</span>
                        <span className={`tabular grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${isToday ? 'bg-accent text-white' : 'text-ink/80'}`}>{parseKey(d).d}</span>
                      </div>
                    );
                  })}

                  {/* Habit rows */}
                  {habits.map((h, ri) => {
                    const c = swatch(h.color, dark);
                    return (
                      <Row key={h.id} h={h} days={days} today={today} zebra={ri % 2 === 1} c={c} onToggle={toggle} />
                    );
                  })}

                  {/* Totals row */}
                  <div className="sticky left-0 z-20 flex items-center border-r border-t border-line bg-sunk px-3 text-[11px] font-semibold text-muted">Done</div>
                  {daily.map((x) => (
                    <div key={x.d} className={`tabular grid h-7 place-items-center border-t border-line text-[10px] font-semibold ${x.d === today ? 'bg-blush/25' : 'bg-sunk/60'} ${x.future ? 'text-faint' : 'text-muted'}`}>
                      {x.future || !x.scheduled ? '·' : `${x.done}`}
                    </div>
                  ))}
                </div>
              </div>
              <Legend />
            </Panel>

            {/* Statistics */}
            <Panel className="p-3 lg:w-[300px] lg:shrink-0">
              <SectionHeader kicker={monthTitle(month)} title="Habit statistics" />
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-2.5 gap-y-1.5 text-[11px]">
                <span className="label-xs !text-[9px]">Habit</span>
                <span className="label-xs text-right !text-[9px]">Rate</span>
                <span className="label-xs text-right !text-[9px]">Now</span>
                <span className="label-xs text-right !text-[9px]">Best</span>
                <span className="label-xs text-right !text-[9px]">Days</span>
                {rows.map(({ h, pct, done, due, streak, longest }) => {
                  const c = swatch(h.color, dark);
                  return (
                    <div key={h.id} className="contents">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.mid }} />
                        <span className="truncate font-medium">{h.name}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <div className="h-1.5 w-10 overflow-hidden rounded-full bg-sunk">
                          <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: c.mid }} />
                        </div>
                        <span className="tabular w-8 text-right font-semibold">{due ? `${Math.round(pct * 100)}%` : '—'}</span>
                      </div>
                      <span className="tabular text-right">{streak}</span>
                      <span className="tabular text-right">{longest}</span>
                      <span className="tabular text-right text-muted">{done}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-faint">Rate counts scheduled days up to today. “Now” and “Best” are streaks in days, or weeks for flexible weekly habits.</p>
            </Panel>
          </div>
        )}

        {habits.length > 0 && <MonthHeatmap days={days} today={today} pcts={daily.map((d) => (d.future || !d.scheduled ? -1 : d.pct))} />}
      </div>
    </div>
  );
}

function Row({ h, days, today, zebra, c, onToggle }: {
  h: Habit;
  days: DateKey[];
  today: DateKey;
  zebra: boolean;
  c: { fill: string; mid: string; ink: string };
  onToggle: (h: Habit, d: DateKey) => void;
}) {
  const { ctx } = useStore();
  return (
    <>
      <div className={`sticky left-0 z-10 flex items-center gap-2 border-r border-line/80 py-1 pl-2 pr-2 ${zebra ? 'bg-[rgb(var(--sunk)/0.5)]' : ''}`} style={{ backgroundColor: 'rgb(var(--card))' }}>
        <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: c.mid }} />
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md" style={{ background: c.fill, color: c.ink }}>
          <HabitIcon name={h.icon} size={13} />
        </span>
        <span className="truncate text-[12px] font-semibold">{h.name}</span>
      </div>
      {days.map((d) => {
        const wd = weekday(d);
        const weekend = wd === 0 || wd === 6;
        const isToday = d === today;
        const future = d > today;
        const before = d < h.startDate;
        const due = ctx.due(h, d);
        const done = ctx.done(h, d);
        const partial = !done && h.target ? ctx.value(h, d) / goalAmount(h) : 0;
        const missed = due && !done && !future && !isToday;
        const label = `${h.name}, ${d}: ${before ? 'before start' : done ? 'done' : missed ? 'missed' : future ? 'upcoming' : due ? 'due' : 'not scheduled'}`;
        return (
          <div key={d} className={`grid h-9 place-items-center border-b border-line/40 ${isToday ? 'bg-blush/20' : weekend ? 'bg-sunk/70' : zebra ? 'bg-sunk/30' : ''}`}>
            <button
              type="button"
              aria-label={label}
              aria-pressed={done}
              disabled={future || before}
              onClick={() => onToggle(h, d)}
              className={`grid h-[22px] w-[22px] place-items-center rounded-[7px] transition active:scale-90 disabled:cursor-default ${future ? 'opacity-40' : ''}`}
              style={
                done
                  ? { background: c.mid, color: c.ink }
                  : before
                    ? { background: 'transparent' }
                    : missed
                      ? { background: 'rgb(var(--coral) / 0.16)', color: 'rgb(var(--coral))' }
                      : due
                        ? { boxShadow: `inset 0 0 0 1.5px ${c.mid}`, background: partial ? c.fill : 'transparent' }
                        : { background: 'transparent' }
              }
            >
              {done ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 20 }}>
                  <Check size={13} strokeWidth={3.2} />
                </motion.span>
              ) : missed ? (
                <X size={10} strokeWidth={2.6} />
              ) : before ? (
                <span className="h-[3px] w-[3px] rounded-full bg-line" />
              ) : !due ? (
                <span className="h-1 w-1 rounded-full bg-faint/50" />
              ) : null}
            </button>
          </div>
        );
      })}
    </>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-3 py-2 text-[10px] text-muted">
      <span className="flex items-center gap-1"><span className="grid h-3.5 w-3.5 place-items-center rounded bg-sage"><Check size={9} strokeWidth={3} /></span> Done</span>
      <span className="flex items-center gap-1"><span className="h-3.5 w-3.5 rounded shadow-[inset_0_0_0_1.5px_rgb(var(--sage))]" /> Due</span>
      <span className="flex items-center gap-1"><span className="grid h-3.5 w-3.5 place-items-center rounded bg-coral/20 text-coral"><X size={8} strokeWidth={3} /></span> Missed</span>
      <span className="flex items-center gap-1"><span className="h-1 w-1 rounded-full bg-faint" /> Not scheduled</span>
      <span className="ml-auto italic">Tap a cell to toggle</span>
    </div>
  );
}

function MonthHeatmap({ days, today, pcts }: { days: DateKey[]; today: DateKey; pcts: number[] }) {
  const { dark, prefs } = useStore();
  const lead = (weekday(days[0]) - prefs.weekStart + 7) % 7;
  const head = Array.from({ length: 7 }, (_, i) => WEEKDAY_LETTER[(i + prefs.weekStart) % 7]);
  return (
    <Panel className="p-3.5">
      <SectionHeader kicker="At a glance" title="Month heatmap" />
      <div className="grid grid-cols-7 gap-1.5">
        {head.map((l, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-faint">{l}</div>
        ))}
        {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
        {days.map((d, i) => (
          <div
            key={d}
            className={`tabular grid aspect-square place-items-center rounded-lg text-[11px] font-semibold ${d === today ? 'ring-2 ring-accent/60' : ''}`}
            style={{ background: pcts[i] < 0 ? 'rgb(var(--sunk))' : intensityColor(pcts[i], dark), color: pcts[i] < 0 ? 'rgb(var(--faint))' : 'rgb(var(--ink))' }}
            title={pcts[i] < 0 ? d : `${d}: ${Math.round(pcts[i] * 100)}%`}
          >
            {parseKey(d).d}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-end gap-1 text-[10px] text-muted">
        Less
        {[0, 0.2, 0.4, 0.6, 0.9, 1].map((p) => (
          <span key={p} className="h-3 w-3 rounded-[4px]" style={{ background: intensityColor(p, dark) }} />
        ))}
        More
      </div>
    </Panel>
  );
}
