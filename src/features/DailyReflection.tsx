import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, DoorOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { longDate } from '../lib/date';
import type { Reflection } from '../lib/types';
import { useStore } from '../store/AppStore';
import { Blossom, Sprig } from '../components/visuals';

const GRATITUDE_PROMPTS = ['I’m grateful for…', 'Something I appreciate…', 'Something I don’t want to take for granted…'];
const GRATITUDE_TINTS = ['rgb(var(--blush) / 0.45)', 'rgb(var(--peach) / 0.45)', 'rgb(var(--butter) / 0.45)'];
const REMINDER_TINTS = ['rgb(var(--powder) / 0.5)', 'rgb(var(--lavender) / 0.5)'];

export function emptyReflection(date: string): Reflection {
  return { date, gratitude: ['', '', ''], reminders: ['', ''], favorites: [false, false], status: 'draft', updatedAt: Date.now() };
}

function AutoText({ value, onChange, placeholder, label, tint, index, autoFocus }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  tint: string;
  index: number;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <motion.label
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.08 }}
      className="relative block rounded-[22px] border border-line/70 px-4 pb-3 pt-3 shadow-soft"
      style={{ background: tint }}
    >
      <span className="flex items-center gap-2 font-serif text-[15px] italic text-ink/80">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-card/80 font-sans text-[10px] font-bold not-italic text-muted">{index + 1}</span>
        {label}
      </span>
      <textarea
        ref={ref}
        rows={1}
        maxLength={500}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 block w-full resize-none bg-transparent font-hand text-[23px] leading-snug text-ink placeholder:text-ink/30 focus:outline-none"
      />
      <span className="pointer-events-none absolute inset-x-4 bottom-2.5 h-px bg-ink/10" />
    </motion.label>
  );
}

export function DailyReflection({ onDone, onBypass }: { onDone: () => void; onBypass: () => void }) {
  const { today, reflectionsByDate, saveReflection } = useStore();
  const existing = reflectionsByDate.get(today);
  const [draft, setDraft] = useState<Reflection>(() => existing ?? emptyReflection(today));
  const [step, setStep] = useState(() => {
    if (!existing) return 0;
    if (existing.gratitude.every((g) => g.trim()) && existing.reminders.every((r) => r.trim())) return 2;
    if (existing.gratitude.every((g) => g.trim())) return 1;
    return 0;
  });
  const [leaving, setLeaving] = useState(false);
  const [confirmBypass, setConfirmBypass] = useState(false);

  // Autosave drafts shortly after typing stops.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => void saveReflection({ ...draft, status: 'draft', updatedAt: Date.now() }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const gratitudeOk = draft.gratitude.every((g) => g.trim().length > 0);
  const remindersOk = draft.reminders.every((r) => r.trim().length > 0);

  const setG = (i: number, v: string) =>
    setDraft((d) => ({ ...d, gratitude: d.gratitude.map((g, j) => (j === i ? v : g)) as Reflection['gratitude'] }));
  const setR = (i: number, v: string) =>
    setDraft((d) => ({ ...d, reminders: d.reminders.map((g, j) => (j === i ? v : g)) as Reflection['reminders'] }));

  const finish = async () => {
    const final: Reflection = {
      ...draft,
      gratitude: draft.gratitude.map((g) => g.trim()) as Reflection['gratitude'],
      reminders: draft.reminders.map((g) => g.trim()) as Reflection['reminders'],
      status: 'complete',
      completedAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveReflection(final);
    setLeaving(true);
    setTimeout(onDone, 650);
  };

  const bg = [
    'linear-gradient(170deg, rgb(var(--blush) / 0.55), rgb(var(--paper)) 45%, rgb(var(--peach) / 0.35))',
    'linear-gradient(170deg, rgb(var(--powder) / 0.55), rgb(var(--paper)) 45%, rgb(var(--lavender) / 0.4))',
    'linear-gradient(170deg, rgb(var(--butter) / 0.5), rgb(var(--paper)) 40%, rgb(var(--sage) / 0.45))',
  ][step];

  return (
    <motion.div
      className="fixed inset-0 z-40 flex flex-col overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={leaving ? { opacity: 0, scale: 1.04, filter: 'blur(6px)' } : { opacity: 1, scale: 1 }}
      transition={{ duration: leaving ? 0.6 : 0.4 }}
    >
      <motion.div className="fixed inset-0 -z-10 paper-grid" animate={{ background: bg }} transition={{ duration: 0.6 }} style={{ background: bg }} />

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-[calc(24px+var(--safe-bottom))] pt-[calc(14px+var(--safe-top))]">
        {/* top bar */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" aria-label={`Step ${step + 1} of 3`}>
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="h-1.5 rounded-full" animate={{ width: i === step ? 26 : 8, background: i <= step ? 'rgb(var(--accent))' : 'rgb(var(--line))' }} />
            ))}
          </div>
          <button type="button" onClick={() => setConfirmBypass(true)} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-muted/80 hover:bg-card/60">
            <DoorOpen size={13} /> Need the app now?
          </button>
        </div>

        <AnimatePresence>
          {confirmBypass && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="panel mt-3 p-4 text-sm">
              <p className="leading-relaxed text-muted">
                Your answers are saved as a draft. You can open the app for now — we’ll bring you back to today’s reflection next time you open it.
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" className="btn-soft flex-1" onClick={() => setConfirmBypass(false)}>
                  Stay
                </button>
                <button type="button" className="btn-primary flex-1" onClick={onBypass}>
                  Open app for now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="g" className="flex flex-1 flex-col" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="relative mt-8">
                <Blossom className="absolute -right-1 -top-4 h-12 w-12 rotate-12" />
                <Blossom className="absolute right-11 top-5 h-6 w-6" petal="rgb(var(--peach))" />
                <div className="label-xs">Step one · Gratitude</div>
                <h1 className="mt-2 pr-14 font-serif text-[34px] font-semibold leading-[1.08] tracking-tight">Three things you’re grateful for.</h1>
                <p className="mt-3 font-serif text-[15px] italic leading-relaxed text-muted">Even on ordinary days, there’s something worth appreciating.</p>
              </div>
              <div className="mt-7 space-y-3">
                {GRATITUDE_PROMPTS.map((p, i) => (
                  <AutoText key={i} index={i} label={p} placeholder="Write it down…" value={draft.gratitude[i]} onChange={(v) => setG(i, v)} tint={GRATITUDE_TINTS[i]} />
                ))}
              </div>
              <div className="mt-auto pt-8">
                <button type="button" disabled={!gratitudeOk} onClick={() => setStep(1)} className="btn-primary w-full py-3.5 text-[15px]">
                  Continue <ArrowRight size={16} />
                </button>
                {!gratitudeOk && <p className="mt-2 text-center text-[11px] text-muted">All three are needed to continue.</p>}
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="r" className="flex flex-1 flex-col" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="relative mt-8">
                <Sprig className="absolute -right-2 -top-6 h-16 w-16" color="rgb(var(--lavender))" />
                <div className="label-xs">Step two · Personal reminders</div>
                <h1 className="mt-2 pr-14 font-serif text-[34px] font-semibold leading-[1.08] tracking-tight">Two things you need to remind yourself.</h1>
                <p className="mt-3 font-serif text-[15px] italic leading-relaxed text-muted">
                  Something like “Progress takes time,” or “I don’t need to have everything figured out.” In your own words.
                </p>
              </div>
              <div className="mt-7 space-y-3">
                {[0, 1].map((i) => (
                  <AutoText key={i} index={i} label={i === 0 ? 'Remember…' : 'And also…'} placeholder="A note to yourself…" value={draft.reminders[i]} onChange={(v) => setR(i, v)} tint={REMINDER_TINTS[i]} />
                ))}
              </div>
              <div className="mt-auto flex gap-2 pt-8">
                <button type="button" onClick={() => setStep(0)} className="btn-soft px-4 py-3.5" aria-label="Back">
                  <ArrowLeft size={16} />
                </button>
                <button type="button" disabled={!remindersOk} onClick={() => setStep(2)} className="btn-primary flex-1 py-3.5 text-[15px]">
                  Continue <ArrowRight size={16} />
                </button>
              </div>
              {!remindersOk && <p className="mt-2 text-center text-[11px] text-muted">Write both reminders to continue.</p>}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="f" className="flex flex-1 flex-col items-center text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="relative mt-[8vh] flex w-full justify-center">
                <Sprig className="absolute left-2 top-0 h-14 w-14 -scale-x-100" />
                <Sprig className="absolute right-2 top-0 h-14 w-14" />
                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring' }}>
                  <Blossom className="h-12 w-12" />
                </motion.div>
              </div>
              <motion.div className="label-xs mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                {longDate(today)}
              </motion.div>
              <motion.h1
                className="mt-4 font-serif text-[40px] font-semibold leading-[1.05] tracking-tight"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.7 }}
              >
                Today is just another day.
              </motion.h1>
              <div className="mt-7 space-y-3 font-serif text-[18px] leading-relaxed text-ink/80">
                {['There have been a lot of them.', 'There will be plenty more.', 'You don’t have to make every day extraordinary.', 'Just make sure you’re living yours.'].map((line, i) => (
                  <motion.p
                    key={line}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 + i * 0.55, duration: 0.6 }}
                    className={i === 3 ? 'pt-2 font-semibold italic text-ink' : i === 1 ? 'pb-2' : ''}
                  >
                    {line}
                  </motion.p>
                ))}
              </div>
              <motion.div className="mt-auto w-full pt-10" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.9 }}>
                <button type="button" onClick={finish} className="btn-primary w-full rounded-2xl py-4 text-base">
                  Make Today Count →
                </button>
                <button type="button" onClick={() => setStep(1)} className="btn-ghost mt-2 w-full text-xs">
                  Go back and edit
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
