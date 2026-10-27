import { AnimatedNumber } from '../components/AnimatedNumber';
import { MacroLine, Stepper } from '../components/ui';
import { fmt1, parseAmount, scale } from '../lib/nutrition';
import type { Macros } from '../lib/types';

/** Quantity picker. Weight-based servings ("100 g") are entered as an amount; others as a number of servings. */
export function Portion({ unit, per, qty, onChange }: { unit: string; per: Macros; qty: number; onChange: (q: number) => void }) {
  const amt = parseAmount(unit);
  const total = scale(per, qty);
  const chips = amt ? [0.5, 1, 1.5, 2].map((k) => k * amt.n) : [0.5, 1, 1.5, 2];

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-medium text-muted">{amt ? 'Amount' : 'Servings'}</div>
          {!amt && unit && <div className="text-xs text-faint">1 serving = {unit}</div>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tracking-tight">
            <AnimatedNumber value={total.kcal} />
            <span className="ml-1 text-sm font-normal text-muted">kcal</span>
          </div>
          <MacroLine p={total.p} c={total.c} f={total.f} />
        </div>
      </div>
      <div className="mt-3">
        {amt ? (
          <Stepper value={qty * amt.n} step={amt.n >= 50 ? 10 : 1} min={1} suffix={amt.u} onChange={(n) => onChange(n / amt.n)} />
        ) : (
          <Stepper value={qty} onChange={onChange} />
        )}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {chips.map((c) => {
          const q = amt ? c / amt.n : c;
          return (
            <button key={c} type="button" className={`chip ${Math.abs(q - qty) < 1e-6 ? 'chip-on' : ''}`} onClick={() => onChange(q)}>
              {amt ? `${fmt1(c)}${amt.u}` : `×${fmt1(c)}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
