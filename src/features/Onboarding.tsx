import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, FlaskConical, Monitor, Moon, Plus, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { HabitIcon } from '../components/HabitIcon';
import { Segmented } from '../components/ui';
import { Blossom, NotebookArt, Sprig, SunArt, TargetArt } from '../components/visuals';
import { HABIT_TEMPLATES, habitFromTemplate, uid } from '../lib/defaults';
import { describeSchedule } from '../lib/habits';
import { swatch } from '../lib/palette';
import type { ThemePref } from '../lib/prefs';
import type { Goal, GoalPeriod } from '../lib/types';
import { useStore } from '../store/AppStore';
import { defaultDeadline } from './GoalEditor';

const STEPS = 5;

export function Onboarding() {
  const store = useStore();
  const { prefs, setPrefs, today, dark } = store;
  const [step, setStep] = useState(0);
  const [name, setName] = useState(prefs.name);
  const [picked, setPicked] = useState<Set<number>>(new Set([1, 2, 4]));
  const [goals, setGoals] = useState<{ title: string; period: GoalPeriod }[]>([{ title: '', period: 'weekly' }]);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    setBusy(true);
    const habits = [...picked].map((i, order) => habitFromTemplate(HABIT_TEMPLATES[i], today, order));
    for (const h of habits) await store.saveHabit(h);
    for (const g of goals.filter((g) => g.title.trim())) {
      const goal: Goal = {
        id: uid(), title: g.title.trim().slice(0, 120), description: '', period: g.period, target: 1, current: 0, unit: 'done',
        deadline: defaultDeadline(today, g.period, prefs.weekStart), categoryId: 'personal', createdAt: Date.now(), archived: false,
      };
      await store.saveGoal(goal);
    }
    setPrefs({ name: name.trim().slice(0, 40), onboarded: true });
  };

  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="paper-grid fixed inset-0 z-40 overflow-y-auto bg-paper">
      <div className="mx-auto flex min-h-full max-w-md flex-col px-5 pb-[calc(24px+var(--safe-bottom))] pt-[calc(16px+var(--safe-top))]">
        {step > 0 && (
          <div className="flex items-center gap-3">
            <button type="button" onClick={back} className="btn-ghost !p-1.5" aria-label="Back"><ArrowLeft size={18} /></button>
            <div className="flex flex-1 gap-1">
              {Array.from({ length: STEPS - 1 }, (_, i) => (
                <motion.span key={i} className="h-1 flex-1 rounded-full" animate={{ background: i < step ? 'rgb(var(--accent))' : 'rgb(var(--line))' }} />
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={step} className="flex flex-1 flex-col" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            {step === 0 && (
              <div className="flex flex-1 flex-col items-center text-center">
                <div className="relative mt-[10vh] h-44 w-64">
                  <SunArt className="absolute inset-x-6 top-0 h-32" />
                  <Sprig className="absolute -left-2 bottom-0 h-20 w-20 -scale-x-100" />
                  <Blossom className="absolute bottom-6 right-4 h-10 w-10" />
                  <Blossom className="absolute bottom-1 right-14 h-6 w-6" petal="rgb(var(--lavender))" />
                </div>
                <div className="label-xs mt-6">Welcome to</div>
                <h1 className="mt-1 font-serif text-[42px] font-semibold leading-none tracking-tight">Habit Tracker Pro</h1>
                <p className="mt-4 max-w-[300px] font-serif text-[16px] italic leading-relaxed text-muted">
                  A gentle planner for the habits you’re building, the days you’re living, and the things you’re grateful for.
                </p>
                <div className="mt-auto w-full space-y-2 pt-10">
                  <button type="button" className="btn-primary w-full py-3.5 text-[15px]" onClick={next}>
                    Let’s begin <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn-ghost w-full text-xs"
                    onClick={async () => {
                      await store.setDemo(true);
                    }}
                  >
                    <FlaskConical size={14} /> Preview with sample data first
                  </button>
                  <p className="text-[10px] text-faint">Sample data is kept separate and never mixes with your own.</p>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-1 flex-col">
                <div className="mt-10">
                  <div className="label-xs">Step one</div>
                  <h1 className="mt-1 font-serif text-[32px] font-semibold leading-tight">What should we call you?</h1>
                  <p className="mt-2 text-sm text-muted">Used only for greetings. It never leaves your device.</p>
                </div>
                <input autoFocus className="input mt-8 !rounded-2xl !py-4 !text-xl font-serif" placeholder="Your first name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && next()} />
                <div className="mt-auto pt-8">
                  <button type="button" className="btn-primary w-full py-3.5" onClick={next}>
                    {name.trim() ? 'Continue' : 'Skip for now'} <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-1 flex-col">
                <div className="mt-6">
                  <div className="label-xs">Step two</div>
                  <h1 className="mt-1 font-serif text-[30px] font-semibold leading-tight">Choose a few habits to start.</h1>
                  <p className="mt-2 text-sm text-muted">Start small — you can add, edit or remove habits anytime.</p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {HABIT_TEMPLATES.map((t, i) => {
                    const on = picked.has(i);
                    const c = swatch(t.color, dark);
                    return (
                      <motion.button
                        key={t.name}
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        aria-pressed={on}
                        onClick={() => {
                          const n = new Set(picked);
                          if (on) n.delete(i);
                          else n.add(i);
                          setPicked(n);
                        }}
                        className={`relative flex items-center gap-2 rounded-2xl border p-2.5 text-left transition ${on ? 'border-transparent shadow-soft' : 'border-line bg-card'}`}
                        style={on ? { background: c.fill } : undefined}
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl" style={{ background: on ? 'rgb(var(--card) / 0.7)' : c.fill, color: c.ink }}>
                          <HabitIcon name={t.icon} size={16} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-semibold" style={on ? { color: c.ink } : undefined}>{t.name}</span>
                          <span className="block truncate text-[10px] text-muted">{describeSchedule(t.schedule)}</span>
                        </span>
                        {on && (
                          <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full" style={{ background: c.mid, color: c.ink }}>
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
                <div className="mt-auto pt-6">
                  <button type="button" className="btn-primary w-full py-3.5" onClick={next}>
                    {picked.size ? `Continue with ${picked.size} habit${picked.size === 1 ? '' : 's'}` : 'Skip — I’ll add my own'} <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-1 flex-col">
                <div className="mt-10">
                  <div className="label-xs">Step three</div>
                  <h1 className="mt-1 font-serif text-[32px] font-semibold leading-tight">Pick your paper.</h1>
                  <p className="mt-2 text-sm text-muted">Change it anytime in settings.</p>
                </div>
                <div className="mt-8 grid grid-cols-3 gap-3">
                  {([
                    ['light', 'Ivory', Sun, '#fbf7f0', ['#f8cdd3', '#c4def4', '#cce1c5']],
                    ['dark', 'Charcoal', Moon, '#1a1716', ['#96626c', '#627a96', '#688462']],
                    ['system', 'Automatic', Monitor, 'linear-gradient(135deg,#fbf7f0 50%,#1a1716 50%)', ['#f8cdd3', '#d8ccef', '#96626c']],
                  ] as [ThemePref, string, typeof Sun, string, string[]][]).map(([v, l, I, bg, dots]) => (
                    <button key={v} type="button" aria-pressed={prefs.theme === v} onClick={() => setPrefs({ theme: v })} className={`rounded-3xl border-2 p-2 transition ${prefs.theme === v ? 'border-accent shadow-soft' : 'border-transparent'}`}>
                      <div className="relative h-28 overflow-hidden rounded-2xl border border-line" style={{ background: bg }}>
                        <div className="absolute inset-x-2 top-3 space-y-1.5">
                          {dots.map((d) => <div key={d} className="h-2.5 rounded-full" style={{ background: d }} />)}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold"><I size={12} /> {l}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-auto pt-8">
                  <button type="button" className="btn-primary w-full py-3.5" onClick={next}>Continue <ArrowRight size={16} /></button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-1 flex-col">
                <div className="relative mt-8">
                  <TargetArt className="absolute -top-2 right-0 h-16 w-16" />
                  <div className="label-xs">Step four</div>
                  <h1 className="mt-1 pr-16 font-serif text-[30px] font-semibold leading-tight">Anything you’re working toward?</h1>
                  <p className="mt-2 text-sm text-muted">Optional. Add a goal or two — you can set targets later.</p>
                </div>
                <div className="mt-6 space-y-2">
                  {goals.map((g, i) => (
                    <div key={i} className="panel space-y-2 p-3">
                      <div className="flex gap-2">
                        <input className="input" placeholder={i === 0 ? 'e.g. Finish my book' : 'Another goal'} value={g.title} maxLength={120} onChange={(e) => setGoals(goals.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                        {goals.length > 1 && (
                          <button type="button" className="btn-ghost !px-2" aria-label="Remove goal" onClick={() => setGoals(goals.filter((_, j) => j !== i))}><X size={16} /></button>
                        )}
                      </div>
                      <Segmented<GoalPeriod> value={g.period} onChange={(p) => setGoals(goals.map((x, j) => (j === i ? { ...x, period: p } : x)))} options={[{ value: 'weekly', label: 'This week' }, { value: 'monthly', label: 'This month' }]} />
                    </div>
                  ))}
                  {goals.length < 4 && (
                    <button type="button" className="flex w-full items-center justify-center gap-1 rounded-2xl border border-dashed border-line py-2.5 text-xs font-semibold text-muted" onClick={() => setGoals([...goals, { title: '', period: 'monthly' }])}>
                      <Plus size={13} /> Add another
                    </button>
                  )}
                </div>
                <div className="mt-auto pt-8">
                  <div className="mb-4 flex items-center gap-3 rounded-2xl bg-blush/30 p-3">
                    <NotebookArt className="h-12 w-14 shrink-0" />
                    <p className="text-[12.5px] leading-snug text-ink/80">Next, your first daily reflection: three gratitudes and two reminders. It greets you once each morning.</p>
                  </div>
                  <button type="button" disabled={busy} className="btn-primary w-full py-3.5" onClick={finish}>
                    Begin my first reflection <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
