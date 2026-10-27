import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props {
  value: number; // 0..∞ fraction of target
  size?: number;
  stroke?: number;
  color?: string;
  over?: string;
  track?: string;
  children?: ReactNode;
  glow?: boolean;
}

/** Progress ring. Past 100% a second lap draws on top in the `over` colour. */
export function Ring({ value, size = 220, stroke = 16, color = 'rgb(var(--accent))', over = 'rgb(var(--over))', track = 'rgb(255 255 255 / 0.06)', children, glow }: Props) {
  const r = (size - stroke) / 2;
  const c = size / 2;
  const base = Math.min(1, Math.max(0, value));
  const extra = Math.min(1, Math.max(0, value - 1));
  const spring = { type: 'spring', stiffness: 60, damping: 18, mass: 0.9 } as const;
  const isOver = value > 1;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 transition-[filter] duration-700"
        style={glow && base > 0 ? { filter: `drop-shadow(0 0 14px ${isOver ? 'rgb(var(--over) / 0.35)' : 'rgb(var(--accent) / 0.3)'})` } : undefined}
        aria-hidden
      >
        <circle cx={c} cy={c} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: base, opacity: base > 0 ? 1 : 0 }}
          transition={spring}
        />
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={over}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: extra, opacity: extra > 0 ? 1 : 0 }}
          transition={{ ...spring, delay: extra > 0 ? 0.35 : 0 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/** Tiny static ring for calendar cells and lists. */
export function MiniRing({ value, size = 28, stroke = 3, logged = true }: { value: number; size?: number; stroke?: number; logged?: boolean }) {
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const v = Math.min(1, value);
  const color = value > 1.1 ? 'rgb(var(--over))' : 'rgb(var(--accent))';
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth={stroke} />
      {logged && v > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${len * v} ${len}`}
        />
      )}
    </svg>
  );
}
