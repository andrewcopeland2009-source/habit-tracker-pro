import { motion } from 'framer-motion';
import { Archive, CalendarClock, CheckCircle2, Minus, Plus, RotateCcw, Trophy } from 'lucide-react';
import { EmptyState, PageHeader, Panel, ProgressBar, SectionHeader } from '../components/ui';
import { ProgressRing, TargetArt } from '../components/visuals';
import { diffDays, longDate, shortDate } from '../lib/date';
import { swatch } from '../lib/palette';
import type { Goal } from '../lib/types';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';
import { normalizeGoal } from '../features/GoalEditor';

const isDone = (g: Goal) => g.current >= g.target;
const fmtNum = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

function dueLabel(g: Goal, today: string) {
  const d = diffDays(today, g.deadline);
  if (d < 0) return { text: `Overdue · ${shortDate(g.deadline)}`, overdue: true };
  if (d === 0) return { text: 'Due today', overdue: false };
  if (d === 1) return { text: 'Due tomorrow', overdue: false };
  return { text: `${d} days left`, overdue: false };
}

function useGoalActions() {
  const { saveGoal, toast } = useStore();
  const ui = useUI();
  const step = (g: Goal) => (g.target >= 50 ? Math.round(g.target / 20) : 1);
  return {
    bump: async (g: Goal, dir: 1 | -1) => {
      const next = normalizeGoal({ ...g, current: Math.max(0, Math.round((g.current + dir * step(g)) * 100) / 100) });
      await saveGoal(next);
      if (!isDone(g) && isDone(next)) {
        toast(`Goal complete: ${g.title} ✿`, 'success');
        ui.celebrate();
      }
    },
  };
}

export function Goals() {
  const { data, today, dark } = useStore();
  const ui = useUI();
  const active = data.goals.filter((g) => !g.archived && !isDone(g));
  const weekly = active.filter((g) => g.period === 'weekly').sort((a, b) => a.deadline.localeCompare(b.deadline));
  const monthly = active.filter((g) => g.period === 'monthly').sort((a, b) => a.deadline.localeCompare(b.deadline));
  const history = data.goals.filter((g) => g.archived || isDone(g)).sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));
  const completed = data.goals.filter(isDone).length;
  const avgProgress = active.length ? active.reduce((a, g) => a + Math.min(1, g.current / g.target), 0) / active.length : 0;

  return (
    <div className="pb-nav">
      <PageHeader kicker="Objectives" title="Goals" right={<button type="button" className="btn-primary !px-3 !py-2 text-xs" onClick={() => ui.editGoal()}><Plus size={14} /> New goal</button>} />
      <div className="space-y-4 px-4">
        <Panel className="paper-grid flex items-center gap-4 p-3.5">
          <ProgressRing value={avgProgress} size={82} stroke={9} color={dark ? '#d39a72' : '#f6b48c'} label="Average progress on active goals">
            <div>
              <div className="tabular font-serif text-lg font-semibold leading-none">{Math.round(avgProgress * 100)}%</div>
              <div className="text-[8.5px] text-muted">avg progress</div>
            </div>
          </ProgressRing>
          <div className="grid flex-1 grid-cols-3 gap-1.5 text-center">
            {[
              ['Active', active.length, 'bg-powder/35'],
              ['Completed', completed, 'bg-sage/35'],
              ['Overdue', active.filter((g) => g.deadline < today).length, 'bg-blush/35'],
            ].map(([l, v, t]) => (
              <div key={l as string} className={`rounded-xl py-2 ${t}`}>
                <div className="tabular font-serif text-xl font-semibold leading-none">{v}</div>
                <div className="label-xs mt-1 !text-[8px]">{l}</div>
              </div>
            ))}
          </div>
        </Panel>

        {!data.goals.length && (
          <Panel>
            <EmptyState art={<TargetArt className="h-20 w-20" />} title="Set your first goal" message="Weekly goals keep momentum. Monthly goals give it direction." action={<button type="button" className="btn-primary" onClick={() => ui.editGoal()}><Plus size={16} /> Add a goal</button>} />
          </Panel>
        )}

        {data.goals.length > 0 && (
          <section>
            <SectionHeader kicker="This week" title="Weekly goals" action={<button type="button" className="btn-soft !px-2.5 !py-1 text-xs" onClick={() => ui.editGoal(undefined, 'weekly')}><Plus size={13} /> Add</button>} />
            {weekly.length ? (
              <Panel className="divide-y divide-line/70">
                {weekly.map((g) => <WeeklyRow key={g.id} g={g} />)}
              </Panel>
            ) : (
              <p className="rounded-2xl border border-dashed border-line px-4 py-4 text-center text-xs text-muted">No active weekly goals.</p>
            )}
          </section>
        )}

        {data.goals.length > 0 && (
          <section>
            <SectionHeader kicker="This month" title="Monthly goals" action={<button type="button" className="btn-soft !px-2.5 !py-1 text-xs" onClick={() => ui.editGoal(undefined, 'monthly')}><Plus size={13} /> Add</button>} />
            {monthly.length ? (
              <div className="grid gap-2.5 sm:grid-cols-2">{monthly.map((g, i) => <MonthlyCard key={g.id} g={g} i={i} />)}</div>
            ) : (
              <p className="rounded-2xl border border-dashed border-line px-4 py-4 text-center text-xs text-muted">No active monthly goals.</p>
            )}
          </section>
        )}

        {history.length > 0 && (
          <section>
            <SectionHeader kicker="Accomplishments" title="Goal history" />
            <Panel className="divide-y divide-line/70">
              {history.map((g) => <HistoryRow key={g.id} g={g} />)}
            </Panel>
          </section>
        )}
      </div>
    </div>
  );
}

function WeeklyRow({ g }: { g: Goal }) {
  const { today, dark, categories, saveGoal } = useStore();
  const ui = useUI();
  const { bump } = useGoalActions();
  const c = swatch(categories.get(g.categoryId)?.color ?? 'stone', dark);
  const due = dueLabel(g, today);
  const p = g.current / g.target;
  return (
    <div className="px-3.5 py-3">
      <div className="flex items-center gap-2">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => ui.editGoal(g)}>
          <div className="truncate text-[14px] font-semibold">{g.title}</div>
          <div className={`flex items-center gap-1 text-[11px] ${due.overdue ? 'text-coral' : 'text-muted'}`}>
            <CalendarClock size={11} /> {due.text} · {categories.get(g.categoryId)?.name}
          </div>
        </button>
        <span className="tabular text-[12px] font-semibold">
          {fmtNum(g.current)}/{fmtNum(g.target)} <span className="font-normal text-muted">{g.unit}</span>
        </span>
        <div className="flex gap-0.5">
          <button type="button" aria-label={`Decrease ${g.title}`} className="grid h-7 w-7 place-items-center rounded-full bg-sunk text-muted" onClick={() => bump(g, -1)}><Minus size={13} /></button>
          <button type="button" aria-label={`Increase ${g.title}`} className="grid h-7 w-7 place-items-center rounded-full" style={{ background: c.fill, color: c.ink }} onClick={() => bump(g, 1)}><Plus size={13} /></button>
        </div>
      </div>
      <ProgressBar className="mt-2" value={p} color={`linear-gradient(90deg, ${c.fill}, ${c.mid})`} height={7} />
      {due.overdue && (
        <button type="button" className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-muted" onClick={() => saveGoal({ ...g, archived: true })}>
          <Archive size={11} /> Move to history
        </button>
      )}
    </div>
  );
}

function MonthlyCard({ g, i }: { g: Goal; i: number }) {
  const { today, dark, categories, saveGoal } = useStore();
  const ui = useUI();
  const { bump } = useGoalActions();
  const c = swatch(categories.get(g.categoryId)?.color ?? 'stone', dark);
  const p = Math.min(1, g.current / g.target);
  const due = dueLabel(g, today);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="panel relative overflow-hidden p-4">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-60" style={{ background: c.fill }} />
      <div className="relative flex items-start gap-3">
        <ProgressRing value={p} size={64} stroke={7} color={c.mid}>
          <span className="tabular text-[13px] font-bold">{Math.round(p * 100)}%</span>
        </ProgressRing>
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => ui.editGoal(g)}>
          <span className="chip mb-1" style={{ background: c.fill, color: c.ink }}>{categories.get(g.categoryId)?.name}</span>
          <div className="font-serif text-[17px] font-semibold leading-tight">{g.title}</div>
          {g.description && <p className="mt-0.5 line-clamp-2 text-[12px] text-muted">{g.description}</p>}
        </button>
      </div>
      <div className="relative mt-3 flex items-center justify-between gap-2 text-[11px]">
        <span className={`flex items-center gap-1 ${due.overdue ? 'text-coral' : 'text-muted'}`}><CalendarClock size={12} /> {longDate(g.deadline)}</span>
        <span className="rounded-full bg-sunk px-2 py-0.5 font-semibold">{due.overdue ? 'Overdue' : 'In progress'}</span>
      </div>
      <div className="relative mt-2.5 flex items-center gap-2">
        <span className="tabular flex-1 text-[13px] font-semibold">{fmtNum(g.current)} <span className="font-normal text-muted">of {fmtNum(g.target)} {g.unit}</span></span>
        {due.overdue && (
          <button type="button" className="btn-ghost !px-2 !py-1 text-[11px]" onClick={() => saveGoal({ ...g, archived: true })}><Archive size={12} /> Close</button>
        )}
        <button type="button" aria-label={`Decrease ${g.title}`} className="grid h-8 w-8 place-items-center rounded-full bg-sunk text-muted" onClick={() => bump(g, -1)}><Minus size={14} /></button>
        <button type="button" aria-label={`Increase ${g.title}`} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: c.mid, color: c.ink }} onClick={() => bump(g, 1)}><Plus size={14} /></button>
      </div>
    </motion.div>
  );
}

function HistoryRow({ g }: { g: Goal }) {
  const { saveGoal } = useStore();
  const ui = useUI();
  const done = isDone(g);
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5">
      {done ? <Trophy size={18} className="shrink-0 text-[#c9a227]" /> : <CheckCircle2 size={18} className="shrink-0 text-faint" />}
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => ui.editGoal(g)}>
        <div className={`truncate text-[13px] font-semibold ${done ? '' : 'text-muted'}`}>{g.title}</div>
        <div className="text-[11px] text-muted">
          {done ? `Completed ${g.completedAt ? new Date(g.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}` : `Closed at ${fmtNum(g.current)}/${fmtNum(g.target)} ${g.unit}`} · {g.period}
        </div>
      </button>
      {g.archived && (
        <button type="button" className="btn-ghost !p-1.5" aria-label="Reopen goal" onClick={() => saveGoal({ ...g, archived: false })}>
          <RotateCcw size={14} />
        </button>
      )}
    </div>
  );
}
