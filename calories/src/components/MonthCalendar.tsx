import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fromKey, monthLabel, todayKey, toKey, WEEKDAYS } from '../lib/date';
import { totalOf } from '../lib/nutrition';
import { useStore } from '../lib/store';
import { MiniRing } from './Ring';

/** Month grid; each logged day shows a small ring of calories against that day's target. */
export function MonthCalendar({ selected, onSelect }: { selected: string; onSelect: (k: string) => void }) {
  const { byDate, targetsOn } = useStore();
  const sel = fromKey(selected);
  const [ym, setYm] = useState({ y: sel.getFullYear(), m: sel.getMonth() });
  const today = todayKey();

  useEffect(() => {
    const d = fromKey(selected);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
  }, [selected]);

  const first = new Date(ym.y, ym.m, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => toKey(new Date(ym.y, ym.m, i + 1)))];
  const isCurrentMonth = ym.y === new Date().getFullYear() && ym.m === new Date().getMonth();

  const shift = (n: number) => setYm(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button className="icon-btn" aria-label="Previous month" onClick={() => shift(-1)}>
          <ChevronLeft size={18} />
        </button>
        <div className="text-sm font-semibold tracking-tight">{monthLabel(ym.y, ym.m)}</div>
        <button className="icon-btn disabled:opacity-25" aria-label="Next month" disabled={isCurrentMonth} onClick={() => shift(1)}>
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="pb-1 text-[11px] font-medium text-faint">
            {w}
          </div>
        ))}
        {cells.map((k, i) => {
          if (!k) return <div key={i} />;
          const entries = byDate.get(k);
          const kcal = entries ? totalOf(entries).kcal : 0;
          const t = targetsOn(k).kcal;
          const future = k > today;
          const isSel = k === selected;
          return (
            <button
              key={k}
              disabled={future}
              onClick={() => onSelect(k)}
              className={`relative mx-auto grid h-10 w-10 place-items-center rounded-full transition-colors disabled:opacity-25 ${isSel ? 'bg-white/[0.09]' : 'active:bg-white/[0.05]'}`}
              aria-label={k}
              aria-pressed={isSel}
            >
              <span className="absolute inset-0 grid place-items-center">
                <MiniRing value={t ? kcal / t : 0} size={36} stroke={2.5} logged={!!entries} />
              </span>
              <span className={`tnum relative text-[13px] ${k === today ? 'font-bold text-accent' : isSel ? 'font-semibold text-ink' : 'text-muted'}`}>{fromKey(k).getDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
