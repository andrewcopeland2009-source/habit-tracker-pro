import { Archive, ArchiveRestore, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { HabitIcon, ICONS } from '../components/HabitIcon';
import { Confirm, Field, Segmented, Sheet, Toggle } from '../components/ui';
import { WEEKDAY_LETTER, isValidKey } from '../lib/date';
import { uid } from '../lib/defaults';
import { describeSchedule } from '../lib/habits';
import { SWATCHES, swatch } from '../lib/palette';
import type { Habit, Schedule } from '../lib/types';
import { useStore } from '../store/AppStore';

type Kind = Schedule['kind'];

export function ColorPicker({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const { dark } = useStore();
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
      {SWATCHES.map((s) => {
        const c = swatch(s.key, dark);
        const active = s.key === value;
        return (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={s.label}
            onClick={() => onChange(s.key)}
            className={`h-8 w-8 rounded-full border-2 transition ${active ? 'scale-110 border-ink/70' : 'border-transparent'}`}
            style={{ background: `linear-gradient(135deg, ${c.fill}, ${c.mid})` }}
          />
        );
      })}
    </div>
  );
}

export function CategoryPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { data, dark, saveCategory } = useStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const add = async () => {
    const n = name.trim();
    if (!n) return;
    const used = new Set(data.categories.map((c) => c.color));
    const color = SWATCHES.find((s) => !used.has(s.key))?.key ?? 'stone';
    const c = { id: uid(), name: n.slice(0, 40), color, builtIn: false };
    await saveCategory(c);
    onChange(c.id);
    setName('');
    setAdding(false);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {data.categories.map((c) => {
        const s = swatch(c.color, dark);
        const active = c.id === value;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? 'border-ink/40 shadow-soft' : 'border-transparent opacity-80'}`}
            style={{ background: s.fill, color: s.ink }}
          >
            {c.name}
          </button>
        );
      })}
      {adding ? (
        <span className="flex items-center gap-1">
          <input autoFocus className="input !w-32 !py-1.5 !text-sm" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} placeholder="Category" maxLength={40} />
          <button type="button" className="btn-soft !px-2.5 !py-1.5 text-xs" onClick={add}>
            Add
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1.5 text-xs font-semibold text-muted">
          <Plus size={12} /> New
        </button>
      )}
    </div>
  );
}

function blank(today: string, order: number): Habit {
  return {
    id: uid(), name: '', description: '', icon: 'sparkles', categoryId: 'health', color: 'sage', schedule: { kind: 'daily' },
    startDate: today, order, archived: false, createdAt: Date.now(),
  };
}

export function HabitEditor({ open, habit, onClose }: { open: boolean; habit?: Habit; onClose: () => void }) {
  const { today, data, saveHabit, deleteHabit, toast, dark } = useStore();
  const [h, setH] = useState<Habit>(() => habit ?? blank(today, data.habits.length));
  const [confirm, setConfirm] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [times, setTimes] = useState(3);
  const [every, setEvery] = useState(2);
  const isNew = !data.habits.some((x) => x.id === h.id);

  useEffect(() => {
    if (!open) return;
    const base = habit ?? blank(today, data.habits.length);
    setH(base);
    const s = base.schedule;
    setWeekdays(s.kind === 'weekdays' ? s.days : [1, 2, 3, 4, 5]);
    setTimes(s.kind === 'timesPerWeek' ? s.times : 3);
    setEvery(s.kind === 'interval' ? s.every : 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, habit]);

  const setKind = (k: Kind) => {
    const s: Schedule = k === 'daily' ? { kind: 'daily' } : k === 'weekdays' ? { kind: 'weekdays', days: weekdays } : k === 'timesPerWeek' ? { kind: 'timesPerWeek', times } : { kind: 'interval', every };
    setH({ ...h, schedule: s });
  };
  const c = swatch(h.color, dark);

  const save = async () => {
    const name = h.name.trim();
    if (!name) return toast('Give your habit a name.', 'error');
    if (!isValidKey(h.startDate)) return toast('Choose a valid start date.', 'error');
    if (h.schedule.kind === 'weekdays' && !h.schedule.days.length) return toast('Pick at least one day.', 'error');
    if (h.target && (!(h.target.amount > 0) || h.target.amount > 100000)) return toast('Target should be a positive number.', 'error');
    await saveHabit({ ...h, name: name.slice(0, 80), description: h.description.trim().slice(0, 300) });
    toast(isNew ? 'Habit added' : 'Habit saved', 'success');
    onClose();
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={isNew ? 'New habit' : 'Edit habit'}
        footer={
          <div className="flex gap-2">
            {!isNew && (
              <button type="button" className="btn-soft !px-3" onClick={() => setConfirm(true)} aria-label="Delete habit">
                <Trash2 size={16} />
              </button>
            )}
            {!isNew && (
              <button
                type="button"
                className="btn-soft !px-3"
                aria-label={h.archived ? 'Restore habit' : 'Archive habit'}
                onClick={async () => {
                  await saveHabit({ ...h, archived: !h.archived });
                  toast(h.archived ? 'Habit restored' : 'Habit archived — history kept');
                  onClose();
                }}
              >
                {h.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
              </button>
            )}
            <button type="button" className="btn-primary flex-1" onClick={save}>
              {isNew ? 'Add habit' : 'Save changes'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: c.fill }}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-card/70" style={{ color: c.ink }}>
              <HabitIcon name={h.icon} size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <input className="w-full bg-transparent font-serif text-lg font-semibold placeholder:text-ink/35 focus:outline-none" style={{ color: c.ink }} placeholder="Habit name" value={h.name} maxLength={80} onChange={(e) => setH({ ...h, name: e.target.value })} aria-label="Habit name" />
              <div className="text-[11px]" style={{ color: c.ink, opacity: 0.75 }}>
                {describeSchedule(h.schedule)}
                {h.target ? ` · ${h.target.amount} ${h.target.unit}` : ''}
              </div>
            </div>
          </div>

          <Field label="Description">
            <input className="input" placeholder="Why does this matter to you?" value={h.description} maxLength={300} onChange={(e) => setH({ ...h, description: e.target.value })} />
          </Field>

          <Field label="Icon">
            <div className="grid grid-cols-8 gap-1.5">
              {Object.keys(ICONS).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-label={k}
                  aria-pressed={h.icon === k}
                  onClick={() => setH({ ...h, icon: k })}
                  className={`grid aspect-square place-items-center rounded-lg border transition ${h.icon === k ? 'border-transparent' : 'border-line/60 text-muted'}`}
                  style={h.icon === k ? { background: c.fill, color: c.ink } : undefined}
                >
                  <HabitIcon name={k} size={16} />
                </button>
              ))}
            </div>
          </Field>

          <Field label="Color">
            <ColorPicker value={h.color} onChange={(color) => setH({ ...h, color })} />
          </Field>

          <Field label="Category">
            <CategoryPicker value={h.categoryId} onChange={(categoryId) => setH({ ...h, categoryId })} />
          </Field>

          <Field label="Schedule">
            <Segmented<Kind>
              value={h.schedule.kind}
              onChange={setKind}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekdays', label: 'Days' },
                { value: 'timesPerWeek', label: 'Per week' },
                { value: 'interval', label: 'Every N' },
              ]}
            />
          </Field>
          {h.schedule.kind === 'weekdays' && (
            <div className="flex justify-between gap-1">
              {WEEKDAY_LETTER.map((l, d) => {
                const on = weekdays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    aria-label={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]}
                    onClick={() => {
                      const next = on ? weekdays.filter((x) => x !== d) : [...weekdays, d].sort();
                      setWeekdays(next);
                      setH({ ...h, schedule: { kind: 'weekdays', days: next } });
                    }}
                    className="h-10 flex-1 rounded-xl text-sm font-bold transition"
                    style={on ? { background: c.mid, color: c.ink } : { background: 'rgb(var(--sunk))', color: 'rgb(var(--muted))' }}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          )}
          {h.schedule.kind === 'timesPerWeek' && (
            <Stepper label="times per week" value={times} min={1} max={7} onChange={(v) => { setTimes(v); setH({ ...h, schedule: { kind: 'timesPerWeek', times: v } }); }} />
          )}
          {h.schedule.kind === 'interval' && (
            <Stepper label={`day${every === 1 ? '' : 's'} between`} prefix="Every" value={every} min={1} max={60} onChange={(v) => { setEvery(v); setH({ ...h, schedule: { kind: 'interval', every: v } }); }} />
          )}

          <Field label="Start date" hint="Days before this are never counted as missed.">
            <input type="date" className="input" value={h.startDate} onChange={(e) => e.target.value && setH({ ...h, startDate: e.target.value })} />
          </Field>

          <div className="rounded-2xl border border-line p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Daily target</div>
                <div className="text-[11px] text-muted">Track an amount, like 8 glasses or 20 pages.</div>
              </div>
              <Toggle label="Daily target" checked={!!h.target} onChange={(on) => setH({ ...h, target: on ? { amount: 5, unit: 'times' } : undefined })} />
            </div>
            {h.target && (
              <div className="mt-3 flex gap-2">
                <input type="number" inputMode="decimal" min={1} className="input !w-24" value={h.target.amount} onChange={(e) => setH({ ...h, target: { ...h.target!, amount: Number(e.target.value) } })} aria-label="Target amount" />
                <input className="input" value={h.target.unit} maxLength={20} placeholder="unit" onChange={(e) => setH({ ...h, target: { ...h.target!, unit: e.target.value } })} aria-label="Target unit" />
              </div>
            )}
          </div>
        </div>
      </Sheet>
      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete habit?"
        message={<>This permanently removes <b>{h.name || 'this habit'}</b> and its entire completion history. Archive it instead if you want to keep the history.</>}
        onConfirm={async () => {
          await deleteHabit(h.id);
          toast('Habit deleted');
          onClose();
        }}
      />
    </>
  );
}

function Stepper({ value, onChange, min, max, label, prefix }: { value: number; onChange: (v: number) => void; min: number; max: number; label: string; prefix?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl bg-sunk py-2">
      {prefix && <span className="text-sm text-muted">{prefix}</span>}
      <button type="button" className="btn-soft !h-9 !w-9 !p-0" aria-label="Decrease" onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <span className="tabular w-8 text-center font-serif text-2xl font-semibold">{value}</span>
      <button type="button" className="btn-soft !h-9 !w-9 !p-0" aria-label="Increase" onClick={() => onChange(Math.min(max, value + 1))}>
        +
      </button>
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}

export function HabitManager({ open, onClose, onEdit }: { open: boolean; onClose: () => void; onEdit: (h?: Habit) => void }) {
  const { data, habits, moveHabit, saveHabit, dark, categories } = useStore();
  const archived = data.habits.filter((h) => h.archived);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Manage habits"
      footer={
        <button type="button" className="btn-primary w-full" onClick={() => onEdit()}>
          <Plus size={16} /> New habit
        </button>
      }
    >
      {!habits.length && <p className="py-6 text-center text-sm text-muted">No active habits yet.</p>}
      <ul className="space-y-1.5">
        {habits.map((h, i) => {
          const c = swatch(h.color, dark);
          return (
            <li key={h.id} className="flex items-center gap-2 rounded-xl border border-line/70 bg-paper/50 p-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: c.fill, color: c.ink }}>
                <HabitIcon name={h.icon} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{h.name}</div>
                <div className="truncate text-[11px] text-muted">
                  {categories.get(h.categoryId)?.name ?? '—'} · {describeSchedule(h.schedule)}
                </div>
              </div>
              <button type="button" className="btn-ghost !p-1.5" disabled={i === 0} onClick={() => moveHabit(h.id, -1)} aria-label={`Move ${h.name} up`}>
                <ChevronUp size={16} />
              </button>
              <button type="button" className="btn-ghost !p-1.5" disabled={i === habits.length - 1} onClick={() => moveHabit(h.id, 1)} aria-label={`Move ${h.name} down`}>
                <ChevronDown size={16} />
              </button>
              <button type="button" className="btn-ghost !p-1.5" onClick={() => onEdit(h)} aria-label={`Edit ${h.name}`}>
                <Pencil size={15} />
              </button>
            </li>
          );
        })}
      </ul>
      {archived.length > 0 && (
        <>
          <div className="label-xs mb-2 mt-5">Archived · history kept</div>
          <ul className="space-y-1.5">
            {archived.map((h) => (
              <li key={h.id} className="flex items-center gap-2 rounded-xl border border-dashed border-line p-2 opacity-80">
                <HabitIcon name={h.icon} className="ml-1 text-muted" />
                <span className="min-w-0 flex-1 truncate text-sm">{h.name}</span>
                <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={() => saveHabit({ ...h, archived: false, order: habits.length })}>
                  <ArchiveRestore size={14} /> Restore
                </button>
                <button type="button" className="btn-ghost !p-1.5" onClick={() => onEdit(h)} aria-label={`Edit ${h.name}`}>
                  <Pencil size={15} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}
