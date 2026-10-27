import { Field, MACRO_COLOR, NumberInput } from '../components/ui';
import { fmt, kcalFromMacros } from '../lib/nutrition';
import type { Macros } from '../lib/types';

export interface FoodDraft {
  name: string;
  unit: string;
  per: Macros;
}

export const blankDraft = (name = ''): FoodDraft => ({ name, unit: '1 serving', per: { kcal: 0, p: 0, c: 0, f: 0 } });

/** Name, serving and per-serving nutrition. Calories auto-fill from macros when left empty. */
export function FoodForm({ draft, onChange, autoFocus }: { draft: FoodDraft; onChange: (d: FoodDraft) => void; autoFocus?: boolean }) {
  const set = (patch: Partial<Macros>) => onChange({ ...draft, per: { ...draft.per, ...patch } });
  const fromMacros = kcalFromMacros(draft.per);
  return (
    <div className="space-y-3">
      <Field label="Name">
        <input
          className="input"
          value={draft.name}
          autoFocus={autoFocus}
          enterKeyHint="next"
          placeholder="e.g. Greek yogurt"
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Serving">
          <input className="input" value={draft.unit} placeholder="100 g" onChange={(e) => onChange({ ...draft, unit: e.target.value })} />
        </Field>
        <Field
          label="Calories"
          hint={
            !draft.per.kcal && fromMacros > 0 ? (
              <button type="button" className="text-accent" onClick={() => set({ kcal: Math.round(fromMacros) })}>
                use {fmt(fromMacros)}
              </button>
            ) : undefined
          }
        >
          <NumberInput value={draft.per.kcal} onChange={(kcal) => set({ kcal })} placeholder="0" />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {(['p', 'c', 'f'] as const).map((k) => (
          <Field key={k} label={{ p: 'Protein', c: 'Carbs', f: 'Fat' }[k]} accent={MACRO_COLOR[k]}>
            <div className="relative">
              <NumberInput value={draft.per[k]} onChange={(v) => set({ [k]: v })} placeholder="0" className="pr-7" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">g</span>
            </div>
          </Field>
        ))}
      </div>
    </div>
  );
}

/** Calories to store: what was typed, or derived from macros if nothing was typed. */
export const finalize = (d: FoodDraft): FoodDraft => ({
  ...d,
  name: d.name.trim(),
  unit: d.unit.trim(),
  per: { ...d.per, kcal: d.per.kcal || Math.round(kcalFromMacros(d.per)) },
});
