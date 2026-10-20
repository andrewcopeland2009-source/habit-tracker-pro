import { Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Confirm, Sheet } from '../components/ui';
import { longDate } from '../lib/date';
import type { DateKey, Reflection } from '../lib/types';
import { useStore } from '../store/AppStore';
import { emptyReflection } from './DailyReflection';
import { MoodPicker } from './MoodPicker';

const G_LABELS = ['I’m grateful for…', 'Something I appreciate…', 'Something I don’t want to take for granted…'];
const TINTS = ['bg-blush/35', 'bg-peach/35', 'bg-butter/35'];

export function ReflectionSheet({ date, onClose }: { date: DateKey | null; onClose: () => void }) {
  const { reflectionsByDate, saveReflection, deleteReflection, toast, today } = useStore();
  const [r, setR] = useState<Reflection | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (date) setR(reflectionsByDate.get(date) ?? emptyReflection(date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  if (!r) return null;
  const exists = reflectionsByDate.has(r.date);
  const complete = r.gratitude.every((g) => g.trim()) && r.reminders.every((x) => x.trim());

  const save = async () => {
    if (!r.gratitude.some((g) => g.trim()) && !r.reminders.some((g) => g.trim())) return toast('Write at least one line to save.', 'error');
    const wasComplete = reflectionsByDate.get(r.date)?.status === 'complete';
    await saveReflection({
      ...r,
      status: complete || wasComplete ? 'complete' : 'draft',
      completedAt: r.completedAt ?? (complete ? Date.now() : undefined),
      updatedAt: Date.now(),
    });
    toast('Reflection saved', 'success');
    onClose();
  };

  return (
    <>
      <Sheet
        open={!!date}
        onClose={onClose}
        title={r.date === today ? 'Today’s reflection' : 'Reflection'}
        footer={
          <div className="flex gap-2">
            {exists && (
              <button type="button" className="btn-soft !px-3" onClick={() => setConfirm(true)} aria-label="Delete reflection">
                <Trash2 size={16} />
              </button>
            )}
            <button type="button" className="btn-primary flex-1" onClick={save}>
              Save
            </button>
          </div>
        }
      >
        <div className="label-xs mb-3">{longDate(r.date)}</div>
        <div className="space-y-2">
          {G_LABELS.map((l, i) => (
            <label key={i} className={`block rounded-2xl px-3.5 py-2.5 ${TINTS[i]}`}>
              <span className="font-serif text-[13px] italic text-muted">{l}</span>
              <textarea
                rows={2}
                maxLength={500}
                className="mt-0.5 block w-full resize-none bg-transparent font-hand text-[21px] leading-snug focus:outline-none"
                value={r.gratitude[i]}
                onChange={(e) => setR({ ...r, gratitude: r.gratitude.map((g, j) => (j === i ? e.target.value : g)) as Reflection['gratitude'] })}
              />
            </label>
          ))}
        </div>
        <div className="label-xs mb-2 mt-4">Personal reminders</div>
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className={`flex items-start gap-2 rounded-2xl px-3.5 py-2.5 ${i ? 'bg-lavender/35' : 'bg-powder/40'}`}>
              <textarea
                rows={2}
                maxLength={500}
                aria-label={`Reminder ${i + 1}`}
                className="block w-full flex-1 resize-none bg-transparent font-hand text-[21px] leading-snug focus:outline-none"
                value={r.reminders[i]}
                onChange={(e) => setR({ ...r, reminders: r.reminders.map((g, j) => (j === i ? e.target.value : g)) as Reflection['reminders'] })}
              />
              <button
                type="button"
                aria-pressed={r.favorites[i]}
                aria-label="Favorite reminder"
                onClick={() => setR({ ...r, favorites: r.favorites.map((f, j) => (j === i ? !f : f)) as Reflection['favorites'] })}
                className="mt-1 text-muted"
              >
                <Star size={18} className={r.favorites[i] ? 'fill-butter text-[#c9a227]' : ''} />
              </button>
            </div>
          ))}
        </div>
        <div className="label-xs mb-2 mt-4">Mood</div>
        <MoodPicker date={r.date} size={34} />
      </Sheet>
      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete this reflection?"
        message={`Your gratitude and reminders from ${longDate(r.date)} will be permanently removed. Your mood entry for that day is kept.`}
        onConfirm={async () => {
          await deleteReflection(r.date);
          toast('Reflection deleted');
          onClose();
        }}
      />
    </>
  );
}
