import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { MonthCalendar } from '../components/MonthCalendar';
import { Card, MacroBar, Segmented } from '../components/ui';
import { addDays, dayLabel, fromKey, longDate, range, shortDate, weekStart } from '../lib/date';
import { fmt, totalOf } from '../lib/nutrition';
import { useStore } from '../lib/store';
import { SLOTS, SLOT_LABEL } from '../lib/types';

type Range = 'week' | 'month' | 'weeks';

interface Bar {
  key: string;
  label: string;
  title: string;
  value: number;
  target: number;
  logged: boolean;
}

/** A day counts as on target when it lands within ±10% of that day's calorie target. */
const onTarget = (kcal: number, target: number) => target > 0 && Math.abs(kcal - target) <= target * 0.1;

export function Progress({ today, openDay }: { today: string; openDay: (k: string) => void }) {
  const { byDate, targetsOn } = useStore();
  const [r, setR] = useState<Range>('week');
  const [picked, setPicked] = useState(today);

  const dayKcal = (k: string) => {
    const e = byDate.get(k);
    return e ? totalOf(e).kcal : 0;
  };

  const bars: Bar[] = useMemo(() => {
    if (r === 'weeks') {
      const start = weekStart(today);
      return Array.from({ length: 12 }, (_, i) => {
        const ws = addDays(start, (i - 11) * 7);
        const days = range(ws, 7).filter((k) => k <= today && byDate.has(k));
        const avg = days.length ? days.reduce((s, k) => s + dayKcal(k), 0) / days.length : 0;
        const tgt = days.length ? days.reduce((s, k) => s + targetsOn(k).kcal, 0) / days.length : targetsOn(ws).kcal;
        return { key: ws, label: i % 3 === 2 || i === 11 ? shortDate(ws) : '', title: `Week of ${shortDate(ws)} · daily avg`, value: avg, target: tgt, logged: days.length > 0 };
      });
    }
    const n = r === 'week' ? 7 : 30;
    return range(addDays(today, -(n - 1)), n).map((k, i) => ({
      key: k,
      label: n === 7 ? fromKey(k).toLocaleDateString(undefined, { weekday: 'narrow' }) : i % 7 === 2 || i === n - 1 ? String(fromKey(k).getDate()) : '',
      title: dayLabel(k, today),
      value: dayKcal(k),
      target: targetsOn(k).kcal,
      logged: byDate.has(k),
    }));
  }, [r, today, byDate, targetsOn]);

  // Stats over the visible period (days only; weeks view covers 84 days).
  const stats = useMemo(() => {
    const n = r === 'week' ? 7 : r === 'month' ? 30 : 84;
    const keys = range(addDays(today, -(n - 1)), n);
    const logged = keys.filter((k) => byDate.has(k));
    const totals = logged.map((k) => totalOf(byDate.get(k)!));
    const avg = (f: (t: (typeof totals)[number]) => number) => (totals.length ? totals.reduce((s, t) => s + f(t), 0) / totals.length : 0);
    return {
      n,
      logged: logged.length,
      kcal: avg((t) => t.kcal),
      p: avg((t) => t.p),
      hit: logged.filter((k, i) => onTarget(totals[i].kcal, targetsOn(k).kcal)).length,
    };
  }, [r, today, byDate, targetsOn]);

  const streaks = useMemo(() => {
    const keys = [...byDate.keys()].sort();
    let best = 0;
    let run = 0;
    let prev = '';
    for (const k of keys) {
      run = prev && addDays(prev, 1) === k ? run + 1 : 1;
      best = Math.max(best, run);
      prev = k;
    }
    // Current streak may end today or yesterday (today not logged yet is fine).
    let cur = 0;
    let k = byDate.has(today) ? today : addDays(today, -1);
    while (byDate.has(k)) {
      cur++;
      k = addDays(k, -1);
    }
    return { cur, best };
  }, [byDate, today]);

  const pickedEntries = byDate.get(picked) ?? [];
  const pickedTotal = totalOf(pickedEntries);
  const pickedT = targetsOn(picked);

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-[22px] font-semibold tracking-tight">Progress</h1>
      </header>

      <Segmented
        value={r}
        onChange={setR}
        options={[
          { value: 'week', label: '7 days' },
          { value: 'month', label: '30 days' },
          { value: 'weeks', label: '12 weeks' },
        ]}
      />

      <Card className="p-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs font-medium text-muted">{r === 'weeks' ? 'Average per day, by week' : 'Calories per day'}</div>
            <div className="mt-1 text-[28px] font-semibold leading-none tracking-tight">
              <AnimatedNumber value={stats.kcal} />
              <span className="ml-1 text-sm font-normal text-muted">avg kcal</span>
            </div>
          </div>
          <Legend />
        </div>
        <BarChart key={r} bars={bars} onPick={r !== 'weeks' ? (k) => setPicked(k) : undefined} />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Days logged" value={stats.logged} suffix={`/ ${stats.n}`} />
        <Stat label="On target" value={stats.logged ? (stats.hit / stats.logged) * 100 : 0} suffix="%" hint="within ±10%" />
        <Stat label="Current streak" value={streaks.cur} suffix={streaks.cur === 1 ? 'day' : 'days'} hint={`best ${streaks.best}`} />
        <Stat label="Avg protein" value={stats.p} suffix="g" />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight">Consistency</h2>
          <span className="text-xs text-faint">last 20 weeks</span>
        </div>
        <Heatmap today={today} onPick={setPicked} picked={picked} />
      </Card>

      <Card className="p-5">
        <MonthCalendar selected={picked} onSelect={setPicked} />
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[15px] font-semibold tracking-tight">{dayLabel(picked, today)}</div>
            <div className="text-xs text-faint">{longDate(picked)}</div>
          </div>
          <button className="flex items-center gap-1 rounded-full bg-white/[0.07] px-3 py-1.5 text-xs font-medium active:bg-white/[0.12]" onClick={() => openDay(picked)}>
            Open day <ArrowRight size={13} />
          </button>
        </div>
        {pickedEntries.length ? (
          <>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-[28px] font-semibold leading-none tracking-tight">
                <AnimatedNumber value={pickedTotal.kcal} />
              </span>
              <span className="text-sm text-muted">of {fmt(pickedT.kcal)} kcal</span>
              <span className={`ml-auto text-xs ${onTarget(pickedTotal.kcal, pickedT.kcal) ? 'text-accent' : 'text-faint'}`}>
                {pickedTotal.kcal > pickedT.kcal ? `${fmt(pickedTotal.kcal - pickedT.kcal)} over` : `${fmt(pickedT.kcal - pickedTotal.kcal)} under`}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-5">
              <MacroBar k="p" value={pickedTotal.p} target={pickedT.p} />
              <MacroBar k="c" value={pickedTotal.c} target={pickedT.c} />
              <MacroBar k="f" value={pickedTotal.f} target={pickedT.f} />
            </div>
            <ul className="mt-5 divide-y divide-line border-t border-line">
              {SLOTS.map((s) => {
                const list = pickedEntries.filter((e) => e.slot === s);
                return (
                  <li key={s} className="flex justify-between py-2.5 text-sm">
                    <span className={list.length ? '' : 'text-faint'}>
                      {SLOT_LABEL[s]}
                      {list.length > 0 && <span className="ml-1.5 text-xs text-faint">{list.length} item{list.length > 1 ? 's' : ''}</span>}
                    </span>
                    <span className="tnum text-muted">{list.length ? fmt(totalOf(list).kcal) : '—'}</span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="mt-4 text-sm text-faint">Nothing logged this day.</p>
        )}
      </Card>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-col items-end gap-1 text-[11px] text-faint">
      <span className="flex items-center gap-1.5">
        <span className="h-0 w-3 border-t border-dashed border-white/40" /> target
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm bg-over" /> over by 10%+
      </span>
    </div>
  );
}

function BarChart({ bars, onPick }: { bars: Bar[]; onPick?: (k: string) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const H = 150;
  const max = Math.max(1, ...bars.map((b) => Math.max(b.value, b.target))) * 1.08;
  const y = (v: number) => H - (v / max) * H;
  const active = hover ?? bars.length - 1;
  const a = bars[active];
  // Target can change over time; draw it as a step line.
  const targetPath = bars.map((b, i) => `${i === 0 ? 'M' : 'L'}${(i / bars.length) * 100} ${y(b.target)} L${((i + 1) / bars.length) * 100} ${y(b.target)}`).join(' ');

  return (
    <div className="mt-5">
      <div className="mb-2 flex h-5 items-baseline justify-between text-xs">
        <span className="text-muted">{a.title}</span>
        <span className="tnum font-medium text-ink">{a.logged ? `${fmt(a.value)} kcal` : 'not logged'}</span>
      </div>
      <div className="relative" style={{ height: H }} onPointerLeave={() => setHover(null)}>
        <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" aria-hidden>
          <line x1="0" x2="100" y1={H} y2={H} stroke="rgb(255 255 255 / 0.08)" vectorEffect="non-scaling-stroke" />
          <path d={targetPath} fill="none" stroke="rgb(255 255 255 / 0.35)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="absolute inset-0 flex items-end" style={{ gap: bars.length > 12 ? 2 : 6 }}>
          {bars.map((b, i) => {
            const over = b.target > 0 && b.value > b.target * 1.1;
            const h = b.logged ? Math.max(3, (b.value / max) * H) : 0;
            return (
              <button
                key={b.key}
                className="relative flex h-full flex-1 items-end"
                aria-label={`${b.title}: ${b.logged ? fmt(b.value) + ' kcal' : 'not logged'}`}
                onPointerEnter={() => setHover(i)}
                onClick={() => {
                  setHover(i);
                  onPick?.(b.key);
                }}
              >
                <motion.span
                  className={`block w-full rounded-t-[4px] ${over ? 'bg-over' : 'bg-accent'} ${i === active ? 'opacity-100' : 'opacity-55'}`}
                  initial={{ height: 0 }}
                  animate={{ height: h }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20, delay: i * (bars.length > 12 ? 0.008 : 0.03) }}
                />
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex text-center text-[10px] text-faint" style={{ gap: bars.length > 12 ? 2 : 6 }}>
        {bars.map((b) => (
          <span key={b.key} className="flex-1 whitespace-nowrap">
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, suffix, hint }: { label: string; value: number; suffix?: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <AnimatedNumber value={value} className="text-2xl font-semibold tracking-tight" />
        {suffix && <span className="text-xs text-faint">{suffix}</span>}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-faint">{hint}</div>}
    </Card>
  );
}

function Heatmap({ today, picked, onPick }: { today: string; picked: string; onPick: (k: string) => void }) {
  const { byDate, targetsOn } = useStore();
  const weeks = 20;
  const start = addDays(weekStart(today), -(weeks - 1) * 7);
  const cols = Array.from({ length: weeks }, (_, w) => range(addDays(start, w * 7), 7));

  const level = (k: string) => {
    const e = byDate.get(k);
    if (!e) return 0;
    const t = targetsOn(k).kcal;
    const kcal = totalOf(e).kcal;
    if (onTarget(kcal, t)) return 3;
    if (t && kcal > t * 1.1) return 4;
    return kcal >= t * 0.5 ? 2 : 1;
  };
  const fill = ['rgb(255 255 255 / 0.05)', 'rgb(var(--accent) / 0.25)', 'rgb(var(--accent) / 0.55)', 'rgb(var(--accent))', 'rgb(var(--over) / 0.8)'];

  return (
    <div>
      <div className="flex gap-[3px]">
        {cols.map((col, w) => (
          <div key={w} className="flex flex-1 flex-col gap-[3px]">
            {col.map((k) =>
              k > today ? (
                <span key={k} className="aspect-square w-full" />
              ) : (
                <button
                  key={k}
                  aria-label={`${k}${byDate.has(k) ? '' : ', not logged'}`}
                  onClick={() => onPick(k)}
                  className={`aspect-square w-full rounded-[3px] transition-transform active:scale-90 ${k === picked ? 'ring-1 ring-white/70' : ''}`}
                  style={{ background: fill[level(k)] }}
                />
              ),
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-3 text-[11px] text-faint">
        <span className="flex items-center gap-1">
          <i className="h-2 w-2 rounded-[2px]" style={{ background: fill[2] }} /> logged
        </span>
        <span className="flex items-center gap-1">
          <i className="h-2 w-2 rounded-[2px]" style={{ background: fill[3] }} /> on target
        </span>
        <span className="flex items-center gap-1">
          <i className="h-2 w-2 rounded-[2px]" style={{ background: fill[4] }} /> over
        </span>
      </div>
    </div>
  );
}
