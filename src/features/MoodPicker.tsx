import { motion } from 'framer-motion';
import { MoodFace } from '../components/visuals';
import { MOOD_META, swatch } from '../lib/palette';
import type { DateKey, MoodLevel } from '../lib/types';
import { useStore } from '../store/AppStore';

export const MOODS: MoodLevel[] = [5, 4, 3, 2, 1];

export function moodColors(m: MoodLevel, dark: boolean) {
  return swatch(MOOD_META[m].color, dark);
}

export function MoodPicker({ date, size = 40 }: { date: DateKey; size?: number }) {
  const { moodsByDate, setMood, dark } = useStore();
  const current = moodsByDate.get(date)?.mood;
  return (
    <div className="flex justify-between gap-1" role="radiogroup" aria-label="Mood">
      {MOODS.map((m) => {
        const c = moodColors(m, dark);
        const active = current === m;
        return (
          <motion.button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            whileTap={{ scale: 0.88 }}
            onClick={() => setMood(date, active ? null : m)}
            className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 transition ${active ? 'bg-sunk' : ''}`}
          >
            <motion.span animate={{ scale: active ? 1.12 : current ? 0.92 : 1, opacity: current && !active ? 0.55 : 1 }}>
              <MoodFace mood={m} size={size} fill={c.fill} ink={c.ink} />
            </motion.span>
            <span className={`text-[10px] font-semibold ${active ? 'text-ink' : 'text-muted'}`}>{MOOD_META[m].label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
