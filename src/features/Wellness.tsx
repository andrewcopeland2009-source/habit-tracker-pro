import { BedDouble, Minus, Moon, Plus, Settings2, Sunrise, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Field, Panel, ProgressBar, SectionHeader, Sheet } from '../components/ui';
import { MoonArt, WaterArt } from '../components/visuals';
import { addDays, formatMinutes, longDate, minutesBetween, range, shortDate } from '../lib/date';
import type { DateKey, SleepEntry } from '../lib/types';
import { useStore } from '../store/AppStore';

export function WaterCard({ date }: { date: DateKey }) {
  const { waterByDate, addWater, undoWater, prefs, setPrefs, today } = useStore();
  const entry = waterByDate.get(date);
  const goal = date === today ? prefs.waterGoal : entry?.goal ?? prefs.waterGoal;
  const ml = entry?.ml ?? 0;
  const pct = goal ? ml / goal : 0;
  const [settings, setSettings] = useState(false);
  const [custom, setCustom] = useState('');

  return (
    <Panel className="relative overflow-hidden p-3.5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-powder/40 blur-2xl" />
      <SectionHeader
        kicker="Hydration"
        title="Water"
        action={
          <button type="button" onClick={() => setSettings(true)} className="btn-ghost !p-1.5" aria-label="Water settings">
            <Settings2 size={15} />
          </button>
        }
      />
      <div className="flex items-center gap-3">
        <WaterArt pct={pct} className="h-[92px] w-[64px] shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="tabular font-serif text-2xl font-semibold leading-none">
            {(ml / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <span className="text-sm font-normal text-muted"> / {(goal / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} L</span>
          </div>
          <ProgressBar className="mt-2" value={pct} color="linear-gradient(90deg,#bfe0f7,#7fb3e0)" />
          <div className="mt-1 text-[11px] text-muted">{pct >= 1 ? 'Goal reached — beautifully done.' : `${Math.max(0, goal - ml)} ml to go`}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {prefs.waterServings.map((s) => (
              <button key={s} type="button" onClick={() => addWater(date, s)} className="rounded-full bg-powder/45 px-2.5 py-1 text-[11px] font-semibold text-ink transition active:scale-95">
                +{s}
              </button>
            ))}
            {entry?.log.length ? (
              <button type="button" onClick={() => undoWater(date)} className="rounded-full px-2 py-1 text-[11px] text-muted" aria-label="Undo last">
                <Undo2 size={13} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <Sheet open={settings} onClose={() => setSettings(false)} title="Hydration settings">
        <div className="space-y-4">
          <Field label={`Daily goal · ${prefs.waterGoal} ml`}>
            <input type="range" min={500} max={5000} step={100} value={prefs.waterGoal} onChange={(e) => setPrefs({ waterGoal: Number(e.target.value) })} className="w-full accent-[#7fb3e0]" />
          </Field>
          <Field label="Serving sizes (ml)">
            <div className="flex flex-wrap gap-1.5">
              {prefs.waterServings.map((s) => (
                <button key={s} type="button" className="chip bg-powder/45 !px-3 !py-1.5 text-ink" onClick={() => setPrefs({ waterServings: prefs.waterServings.filter((x) => x !== s) })} aria-label={`Remove ${s} ml serving`}>
                  {s} ml <Minus size={11} />
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input type="number" inputMode="numeric" className="input" placeholder="Add serving, e.g. 330" value={custom} onChange={(e) => setCustom(e.target.value)} />
              <button
                type="button"
                className="btn-soft"
                onClick={() => {
                  const n = Math.round(Number(custom));
                  if (n > 0 && n <= 3000 && !prefs.waterServings.includes(n)) setPrefs({ waterServings: [...prefs.waterServings, n].sort((a, b) => a - b).slice(0, 6) });
                  setCustom('');
                }}
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </Field>
          <div>
            <div className="mb-2 text-xs font-semibold text-muted">Adjust today manually</div>
            <div className="flex gap-2">
              <button type="button" className="btn-soft flex-1" onClick={() => addWater(date, -250)}>
                −250 ml
              </button>
              <button type="button" className="btn-soft flex-1" onClick={() => addWater(date, 250)}>
                +250 ml
              </button>
            </div>
          </div>
        </div>
      </Sheet>
    </Panel>
  );
}

export function SleepSheet({ date, open, onClose }: { date: DateKey; open: boolean; onClose: () => void }) {
  const { sleepByDate, saveSleep, deleteSleep, toast } = useStore();
  const existing = sleepByDate.get(date);
  const [bed, setBed] = useState(existing?.bedtime ?? '23:00');
  const [wake, setWake] = useState(existing?.wake ?? '07:00');
  const [quality, setQuality] = useState<SleepEntry['quality']>(existing?.quality);
  useEffect(() => {
    if (!open) return;
    setBed(existing?.bedtime ?? '23:00');
    setWake(existing?.wake ?? '07:00');
    setQuality(existing?.quality);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date]);
  const minutes = bed && wake ? minutesBetween(bed, wake) : 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Log sleep"
      footer={
        <div className="flex gap-2">
          {existing && (
            <button type="button" className="btn-soft" onClick={async () => { await deleteSleep(date); toast('Sleep entry removed'); onClose(); }}>
              Remove
            </button>
          )}
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={async () => {
              if (!bed || !wake) return toast('Enter both times.', 'error');
              await saveSleep({ date, bedtime: bed, wake, minutes, quality, updatedAt: Date.now() });
              toast(`Logged ${formatMinutes(minutes)} of sleep`, 'success');
              onClose();
            }}
          >
            Save
          </button>
        </div>
      }
    >
      <div className="label-xs mb-3">Night before {longDate(date)}</div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Bedtime">
          <input type="time" className="input" value={bed} onChange={(e) => setBed(e.target.value)} />
        </Field>
        <Field label="Woke up">
          <input type="time" className="input" value={wake} onChange={(e) => setWake(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4 rounded-2xl bg-lavender/30 p-4 text-center">
        <div className="label-xs">Duration</div>
        <div className="tabular font-serif text-3xl font-semibold">{formatMinutes(minutes)}</div>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 text-xs font-semibold text-muted">How rested do you feel? (optional)</div>
        <div className="flex gap-1.5">
          {([1, 2, 3, 4, 5] as const).map((q) => (
            <button key={q} type="button" aria-pressed={quality === q} onClick={() => setQuality(quality === q ? undefined : q)} className={`h-10 flex-1 rounded-xl text-sm font-semibold transition ${quality === q ? 'bg-lavender text-ink' : 'bg-sunk text-muted'}`}>
              {q}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

export function SleepCard({ date }: { date: DateKey }) {
  const { sleepByDate } = useStore();
  const [open, setOpen] = useState(false);
  const entry = sleepByDate.get(date);
  const week = range(addDays(date, -6), date).map((d) => sleepByDate.get(d)?.minutes ?? 0);
  const logged = week.filter(Boolean);
  const avg = logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : 0;
  const max = Math.max(600, ...week);

  return (
    <Panel className="relative overflow-hidden p-3.5">
      <MoonArt className="pointer-events-none absolute -right-2 -top-2 h-16 w-16 opacity-70" />
      <SectionHeader kicker="Rest" title="Sleep" />
      {entry ? (
        <button type="button" onClick={() => setOpen(true)} className="block w-full text-left">
          <div className="tabular font-serif text-2xl font-semibold leading-none">{formatMinutes(entry.minutes)}</div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
            <span className="flex items-center gap-0.5"><Moon size={11} /> {entry.bedtime}</span>
            <span className="flex items-center gap-0.5"><Sunrise size={11} /> {entry.wake}</span>
          </div>
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-2 rounded-xl border border-dashed border-lavender bg-lavender/15 px-3 py-2.5 text-left text-sm font-semibold">
          <BedDouble size={16} className="text-muted" /> Log last night
        </button>
      )}
      <div className="mt-3 flex h-10 items-end gap-1" aria-label="Sleep over the last 7 days">
        {week.map((m, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-0.5" title={m ? `${shortDate(addDays(date, i - 6))}: ${formatMinutes(m)}` : 'No entry'}>
            <div className="w-full rounded-t-[4px]" style={{ height: `${Math.max(3, (m / max) * 34)}px`, background: m ? (i === 6 ? 'rgb(var(--lavender))' : 'rgb(var(--powder))') : 'rgb(var(--sunk))' }} />
          </div>
        ))}
      </div>
      <div className="mt-1 text-[10px] text-muted">{avg ? `7-day avg ${formatMinutes(avg)}` : 'No sleep logged this week'}</div>
      <SleepSheet date={date} open={open} onClose={() => setOpen(false)} />
    </Panel>
  );
}
