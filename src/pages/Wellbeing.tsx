import { ChevronLeft, ChevronRight, Moon, Plus, Sunrise } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTip, axisProps, gridStroke } from '../components/charts';
import { Panel, SectionHeader, Sheet } from '../components/ui';
import { MoodFace, ProgressRing } from '../components/visuals';
import { WEEKDAY_LETTER, WEEKDAY_SHORT, addDays, addMonths, formatMinutes, longDate, monthDays, monthStart, monthTitle, parseKey, range, shortDate, weekStartOf, weekday } from '../lib/date';
import { moodStats, sleepStats } from '../lib/insights';
import { MOOD_META } from '../lib/palette';
import type { DateKey, MoodLevel } from '../lib/types';
import { useStore } from '../store/AppStore';
import { MOODS, MoodPicker, moodColors } from '../features/MoodPicker';
import { SleepSheet, WaterCard } from '../features/Wellness';

export function MoodInsights() {
  const { today, data, moodsByDate, dark, prefs } = useStore();
  const [month, setMonth] = useState(monthStart(today));
  const [editing, setEditing] = useState<DateKey | null>(null);
  const days = monthDays(month);
  const stats = moodStats(data.moods, month, days[days.length - 1]);
  const lead = (weekday(days[0]) - prefs.weekStart + 7) % 7;

  const weekly = useMemo(() => {
    const ws = weekStartOf(today, prefs.weekStart);
    return Array.from({ length: 10 }, (_, i) => {
      const s = addDays(ws, -7 * (9 - i));
      const m = moodStats(data.moods, s, addDays(s, 6));
      return { label: shortDate(s), avg: m.total ? Number(m.avg.toFixed(2)) : null, n: m.total };
    });
  }, [data.moods, today, prefs.weekStart]);

  const history = [...data.moods].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  const dist = MOODS.map((m) => ({ m, label: MOOD_META[m].label, n: stats.counts[m], fill: moodColors(m, dark).mid }));

  return (
    <div className="space-y-3.5">
      <Panel className="p-3.5">
        <SectionHeader kicker="Today" title="Mood check-in" />
        <MoodPicker date={today} />
      </Panel>

      <Panel className="p-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <div>
            <div className="label-xs">Mood calendar</div>
            <h2 className="font-serif text-[17px] font-semibold">{monthTitle(month)}</h2>
          </div>
          <div className="flex gap-1">
            <button type="button" className="btn-soft !p-1.5" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft size={16} /></button>
            <button type="button" className="btn-soft !p-1.5" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-faint">{WEEKDAY_LETTER[(i + prefs.weekStart) % 7]}</div>
          ))}
          {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
          {days.map((d) => {
            const m = moodsByDate.get(d)?.mood;
            const c = m ? moodColors(m, dark) : null;
            return (
              <button
                key={d}
                type="button"
                disabled={d > today}
                onClick={() => setEditing(d)}
                aria-label={`${longDate(d)}${m ? `: ${MOOD_META[m].label}` : ''}`}
                className={`relative grid aspect-square place-items-center rounded-xl text-[10px] font-semibold transition disabled:opacity-40 ${d === today ? 'ring-2 ring-accent/50' : ''}`}
                style={{ background: c ? c.fill : 'rgb(var(--sunk))' }}
              >
                {m ? <MoodFace mood={m} size={24} fill={c!.fill} ink={c!.ink} /> : <span className="text-faint">{parseKey(d).d}</span>}
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Panel className="p-3.5">
          <SectionHeader kicker={monthTitle(month)} title="Mood distribution" />
          {stats.total ? (
            <div className="space-y-1.5">
              {dist.map((d) => (
                <div key={d.m} className="flex items-center gap-2 text-xs">
                  <MoodFace mood={d.m} size={22} fill={moodColors(d.m, dark).fill} ink={moodColors(d.m, dark).ink} />
                  <span className="w-14 font-semibold">{d.label}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-sunk">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(d.n / stats.total) * 100}%`, background: d.fill }} />
                  </div>
                  <span className="tabular w-5 text-right text-muted">{d.n}</span>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between rounded-xl bg-sunk px-3 py-2 text-xs">
                <span className="text-muted">Most common</span>
                <span className="font-semibold">{stats.common ? MOOD_META[stats.common as MoodLevel].label : '—'}</span>
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-muted">No moods recorded this month.</p>
          )}
        </Panel>

        <Panel className="p-3.5">
          <SectionHeader kicker="10 weeks" title="Weekly mood trend" />
          {weekly.filter((w) => w.avg !== null).length >= 2 ? (
            <div className="h-[150px]">
              <ResponsiveContainer>
                <LineChart data={weekly} margin={{ top: 8, right: 8, left: -26, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="2 4" />
                  <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
                  <YAxis {...axisProps} domain={[1, 5]} ticks={[1, 3, 5]} tickFormatter={(v) => MOOD_META[v as MoodLevel].label.slice(0, 4)} />
                  <Tooltip content={<ChartTip render={(p) => (p.avg ? `Week of ${p.label} · avg ${p.avg} (${p.n} days)` : `Week of ${p.label} · no entries`)} />} />
                  <Line type="monotone" dataKey="avg" connectNulls stroke={dark ? '#c98592' : '#e3a2c4'} strokeWidth={2.4} dot={{ r: 3, fill: dark ? '#f1d475' : '#f1d475', stroke: 'none' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-muted">Check in for two weeks to see a trend.</p>
          )}
        </Panel>
      </div>

      <Panel className="p-3.5">
        <SectionHeader kicker="Recent" title="Mood history" />
        {history.length ? (
          <ul className="divide-y divide-line/70">
            {history.map((m) => {
              const c = moodColors(m.mood, dark);
              return (
                <li key={m.date}>
                  <button type="button" className="flex w-full items-center gap-3 py-2 text-left" onClick={() => setEditing(m.date)}>
                    <MoodFace mood={m.mood} size={28} fill={c.fill} ink={c.ink} />
                    <span className="flex-1 text-[13px] font-medium">{MOOD_META[m.mood].label}</span>
                    <span className="text-[11px] text-muted">{longDate(m.date)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-muted">Your check-ins will be listed here.</p>
        )}
        <p className="mt-3 text-[10px] leading-relaxed text-faint">Mood tracking is a personal reflection tool. It doesn’t diagnose or assess any condition.</p>
      </Panel>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Mood">
        {editing && (
          <>
            <div className="label-xs mb-3">{longDate(editing)}</div>
            <MoodPicker date={editing} />
            <p className="mt-3 text-center text-[11px] text-muted">Tap the selected mood again to clear it.</p>
          </>
        )}
      </Sheet>
    </div>
  );
}

export function SleepInsights() {
  const { today, data, sleepByDate, dark } = useStore();
  const [logDate, setLogDate] = useState<DateKey | null>(null);
  const week = range(addDays(today, -6), today).map((d) => ({ d, label: WEEKDAY_SHORT[weekday(d)], hours: (sleepByDate.get(d)?.minutes ?? 0) / 60 }));
  const month = range(addDays(today, -29), today).map((d) => ({ d, label: String(parseKey(d).d), hours: sleepByDate.get(d) ? Number(((sleepByDate.get(d)!.minutes) / 60).toFixed(2)) : null }));
  const s7 = sleepStats(data.sleep, addDays(today, -6), today);
  const s30 = sleepStats(data.sleep, addDays(today, -29), today);
  const recent = [...data.sleep].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  const lav = dark ? '#a491c6' : '#bea9e3';
  const pow = dark ? '#81a8cc' : '#9cc4e8';

  return (
    <div className="space-y-3.5">
      <Panel className="relative overflow-hidden p-3.5" style={{ background: `linear-gradient(140deg, rgb(var(--lavender) / 0.35), rgb(var(--card)) 60%, rgb(var(--powder) / 0.3))` }}>
        <div className="flex items-center gap-4">
          <ProgressRing value={s30.consistency} size={86} stroke={9} color={lav} label="Sleep consistency">
            <div>
              <div className="tabular font-serif text-lg font-semibold leading-none">{s30.count ? `${Math.round(s30.consistency * 100)}%` : '—'}</div>
              <div className="text-[8.5px] text-muted">consistent</div>
            </div>
          </ProgressRing>
          <div className="grid flex-1 grid-cols-2 gap-1.5">
            <div className="rounded-xl bg-card/70 p-2">
              <div className="label-xs !text-[8.5px]">7-day avg</div>
              <div className="tabular font-serif text-lg font-semibold">{s7.count ? formatMinutes(s7.avg) : '—'}</div>
            </div>
            <div className="rounded-xl bg-card/70 p-2">
              <div className="label-xs !text-[8.5px]">30-day avg</div>
              <div className="tabular font-serif text-lg font-semibold">{s30.count ? formatMinutes(s30.avg) : '—'}</div>
            </div>
            <div className="col-span-2 rounded-xl bg-card/70 p-2 text-[11px] text-muted">
              {s30.count >= 3 ? `Bedtimes vary by about ${Math.round(s30.bedSpread)} minutes.` : 'Log a few nights to measure consistency.'}
            </div>
          </div>
        </div>
        <button type="button" className="btn-primary mt-3 w-full" onClick={() => setLogDate(today)}>
          <Plus size={15} /> Log last night
        </button>
      </Panel>

      <Panel className="p-3.5">
        <SectionHeader kicker="This week" title="Weekly sleep" />
        <div className="h-[140px]">
          <ResponsiveContainer>
            <BarChart data={week} margin={{ top: 6, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="2 4" />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} domain={[0, 12]} ticks={[0, 4, 8, 12]} />
              <ReferenceLine y={8} stroke={lav} strokeDasharray="4 4" />
              <Tooltip cursor={{ fill: 'rgb(var(--sunk))' }} content={<ChartTip render={(p) => (p.hours ? `${shortDate(p.d)} · ${formatMinutes(p.hours * 60)}` : `${shortDate(p.d)} · not logged`)} />} />
              <Bar dataKey="hours" radius={[6, 6, 2, 2]}>
                {week.map((w) => <Cell key={w.d} fill={w.d === today ? lav : pow} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel className="p-3.5">
        <SectionHeader kicker="Last 30 days" title="Monthly sleep history" />
        {s30.count >= 2 ? (
          <div className="h-[140px]">
            <ResponsiveContainer>
              <AreaChart data={month} margin={{ top: 6, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="sl" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor={pow} stopOpacity={0.6} />
                    <stop offset="1" stopColor={lav} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="2 4" />
                <XAxis dataKey="label" {...axisProps} interval={4} />
                <YAxis {...axisProps} domain={[0, 12]} ticks={[0, 4, 8, 12]} />
                <Tooltip content={<ChartTip render={(p) => (p.hours ? `${shortDate(p.d)} · ${formatMinutes(p.hours * 60)}` : `${shortDate(p.d)} · not logged`)} />} />
                <Area type="monotone" dataKey="hours" connectNulls stroke={dark ? '#a491c6' : '#8f7cc4'} strokeWidth={2} fill="url(#sl)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-6 text-center text-xs text-muted">Log at least two nights to see your history.</p>
        )}
      </Panel>

      <Panel className="p-3.5">
        <SectionHeader kicker="Entries" title="Recent nights" />
        {recent.length ? (
          <ul className="divide-y divide-line/70">
            {recent.map((s) => (
              <li key={s.date}>
                <button type="button" className="flex w-full items-center gap-3 py-2 text-left" onClick={() => setLogDate(s.date)}>
                  <span className="w-20 text-[12px] font-semibold">{shortDate(s.date)}</span>
                  <span className="flex flex-1 items-center gap-2 text-[11px] text-muted">
                    <Moon size={11} /> {s.bedtime} <Sunrise size={11} /> {s.wake}
                  </span>
                  <span className="tabular text-[13px] font-semibold">{formatMinutes(s.minutes)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted">No nights logged yet.</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <input type="date" max={today} className="input !py-1.5" aria-label="Log sleep for a date" onChange={(e) => e.target.value && e.target.value <= today && setLogDate(e.target.value)} />
          <span className="shrink-0 text-[11px] text-muted">log another date</span>
        </div>
      </Panel>
      <SleepSheet date={logDate ?? today} open={!!logDate} onClose={() => setLogDate(null)} />
    </div>
  );
}

export function WaterInsights() {
  const { today, waterByDate, prefs, dark } = useStore();
  const days = range(addDays(today, -13), today).map((d) => {
    const w = waterByDate.get(d);
    return { d, label: WEEKDAY_SHORT[weekday(d)].slice(0, 2), ml: w?.ml ?? 0, goal: d === today ? prefs.waterGoal : w?.goal ?? prefs.waterGoal };
  });
  const last7 = days.slice(-7);
  const logged = last7.filter((d) => d.ml > 0);
  const avg = logged.length ? logged.reduce((a, b) => a + b.ml, 0) / logged.length : 0;
  const met = last7.filter((d) => d.ml >= d.goal).length;
  const blue = dark ? '#81a8cc' : '#9cc4e8';
  return (
    <div className="space-y-3.5">
      <WaterCard date={today} />
      <div className="grid grid-cols-3 gap-2">
        {[
          ['7-day average', avg ? `${(avg / 1000).toFixed(2)} L` : '—'],
          ['Goal met', `${met}/7 days`],
          ['Daily goal', `${(prefs.waterGoal / 1000).toFixed(1)} L`],
        ].map(([k, v]) => (
          <Panel key={k} className="p-2.5">
            <div className="label-xs !text-[8.5px]">{k}</div>
            <div className="tabular mt-0.5 font-serif text-[15px] font-semibold">{v}</div>
          </Panel>
        ))}
      </div>
      <Panel className="p-3.5">
        <SectionHeader kicker="Two weeks" title="Hydration history" />
        <div className="h-[150px]">
          <ResponsiveContainer>
            <BarChart data={days} margin={{ top: 6, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="wt" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#bfe0f7" />
                  <stop offset="1" stopColor="#7fb3e0" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="2 4" />
              <XAxis dataKey="label" {...axisProps} interval={0} />
              <YAxis {...axisProps} tickFormatter={(v) => `${v / 1000}L`} />
              <ReferenceLine y={prefs.waterGoal} stroke={blue} strokeDasharray="4 4" />
              <Tooltip cursor={{ fill: 'rgb(var(--sunk))' }} content={<ChartTip render={(p) => `${shortDate(p.d)} · ${p.ml} ml of ${p.goal}`} />} />
              <Bar dataKey="ml" radius={[6, 6, 2, 2]} fill="url(#wt)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}
