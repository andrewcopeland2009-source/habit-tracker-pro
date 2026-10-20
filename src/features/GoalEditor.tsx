import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Confirm, Field, Segmented, Sheet } from '../components/ui';
import { addDays, addMonths, isValidKey, weekStartOf } from '../lib/date';
import { uid } from '../lib/defaults';
import type { Goal, GoalPeriod } from '../lib/types';
import { useStore } from '../store/AppStore';
import { CategoryPicker } from './HabitEditor';

export function defaultDeadline(today: string, period: GoalPeriod, weekStart: number) {
  return period === 'weekly' ? addDays(weekStartOf(today, weekStart), 6) : addDays(addMonths(today, 1), -1);
}

/** Keeps completedAt in sync with progress. */
export function normalizeGoal(g: Goal): Goal {
  const done = g.current >= g.target;
  return { ...g, completedAt: done ? g.completedAt ?? Date.now() : undefined };
}

export function GoalEditor({ open, goal, period, onClose }: { open: boolean; goal?: Goal; period?: GoalPeriod; onClose: () => void }) {
  const { today, prefs, data, saveGoal, deleteGoal, toast } = useStore();
  const make = (): Goal => {
    const p = period ?? 'weekly';
    return {
      id: uid(), title: '', description: '', period: p, target: 5, current: 0, unit: 'times',
      deadline: defaultDeadline(today, p, prefs.weekStart), categoryId: 'personal', createdAt: Date.now(), archived: false,
    };
  };
  const [g, setG] = useState<Goal>(() => goal ?? make());
  const [confirm, setConfirm] = useState(false);
  const isNew = !data.goals.some((x) => x.id === g.id);

  useEffect(() => {
    if (open) setG(goal ?? make());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, goal]);

  const save = async () => {
    if (!g.title.trim()) return toast('Give your goal a title.', 'error');
    if (!(g.target > 0)) return toast('Target must be greater than zero.', 'error');
    if (!(g.current >= 0)) return toast('Progress can’t be negative.', 'error');
    if (!isValidKey(g.deadline)) return toast('Choose a valid deadline.', 'error');
    await saveGoal(normalizeGoal({ ...g, title: g.title.trim().slice(0, 120), description: g.description.trim().slice(0, 500) }));
    toast(isNew ? 'Goal added' : 'Goal saved', 'success');
    onClose();
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={isNew ? 'New goal' : 'Edit goal'}
        footer={
          <div className="flex gap-2">
            {!isNew && (
              <button type="button" className="btn-soft !px-3" onClick={() => setConfirm(true)} aria-label="Delete goal">
                <Trash2 size={16} />
              </button>
            )}
            <button type="button" className="btn-primary flex-1" onClick={save}>
              {isNew ? 'Add goal' : 'Save changes'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Segmented<GoalPeriod>
            value={g.period}
            onChange={(p) => setG({ ...g, period: p, deadline: isNew ? defaultDeadline(today, p, prefs.weekStart) : g.deadline })}
            options={[
              { value: 'weekly', label: 'Weekly goal' },
              { value: 'monthly', label: 'Monthly goal' },
            ]}
          />
          <Field label="Title">
            <input className="input" autoFocus={isNew} value={g.title} maxLength={120} placeholder="e.g. Run 15 km" onChange={(e) => setG({ ...g, title: e.target.value })} />
          </Field>
          <Field label="Description">
            <textarea className="input min-h-[70px] resize-none" value={g.description} maxLength={500} placeholder="What does done look like?" onChange={(e) => setG({ ...g, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Progress">
              <input type="number" inputMode="decimal" min={0} className="input" value={g.current} onChange={(e) => setG({ ...g, current: Number(e.target.value) })} />
            </Field>
            <Field label="Target">
              <input type="number" inputMode="decimal" min={1} className="input" value={g.target} onChange={(e) => setG({ ...g, target: Number(e.target.value) })} />
            </Field>
            <Field label="Unit">
              <input className="input" value={g.unit} maxLength={20} onChange={(e) => setG({ ...g, unit: e.target.value })} />
            </Field>
          </div>
          <Field label="Deadline">
            <input type="date" className="input" value={g.deadline} onChange={(e) => e.target.value && setG({ ...g, deadline: e.target.value })} />
          </Field>
          <Field label="Category">
            <CategoryPicker value={g.categoryId} onChange={(categoryId) => setG({ ...g, categoryId })} />
          </Field>
        </div>
      </Sheet>
      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete goal?"
        message={<>“{g.title}” will be removed permanently, including from your goal history.</>}
        onConfirm={async () => {
          await deleteGoal(g.id);
          toast('Goal deleted');
          onClose();
        }}
      />
    </>
  );
}
