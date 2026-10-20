import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import type { MoodLevel } from '../lib/types';

export function ProgressRing({ value, size = 96, stroke = 9, color, track, children, label }: {
  value: number;
  size?: number;
  stroke?: number;
  color: string;
  track?: string;
  children?: ReactNode;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value || 0));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(pct * 100)} percent`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track ?? 'rgb(var(--sunk))'} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r - stroke / 2 - 2} fill="none" stroke="rgb(var(--line))" strokeWidth={0.75} strokeDasharray="1.5 3.5" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function CheckCircle({ checked, color, ink, onClick, label, size = 30, partial = 0 }: {
  checked: boolean;
  color: string;
  ink: string;
  onClick: () => void;
  label: string;
  size?: number;
  partial?: number;
}) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onClick}
      whileTap={{ scale: 0.82 }}
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 1.5} fill={checked ? color : 'transparent'} stroke={checked ? color : 'rgb(var(--line))'} strokeWidth={2} />
        {!checked && partial > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 1.5}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={`${Math.PI * (size - 3) * partial} 999`}
          />
        )}
      </svg>
      <motion.span
        initial={false}
        animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0, rotate: checked ? 0 : -30 }}
        transition={{ type: 'spring', stiffness: 600, damping: 22 }}
        className="relative"
        style={{ color: ink }}
      >
        <Check size={size * 0.55} strokeWidth={3} />
      </motion.span>
      {checked && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ border: `2px solid ${color}` }}
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 1.7, opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      )}
    </motion.button>
  );
}

/** Hand-drawn style mood faces. */
export function MoodFace({ mood, size = 36, fill, ink }: { mood: MoodLevel; size?: number; fill: string; ink: string }) {
  const mouth: Record<MoodLevel, string> = {
    5: 'M11 21 Q18 29 25 21',
    4: 'M12 22 Q18 26.5 24 22',
    3: 'M12.5 23 L23.5 23',
    2: 'M12 25 Q18 21 24 25',
    1: 'M11.5 26 Q18 19.5 24.5 26',
  };
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden>
      <circle cx="18" cy="18" r="16.5" fill={fill} />
      <circle cx="18" cy="18" r="16.5" fill="none" stroke={ink} strokeOpacity="0.25" />
      {mood === 5 ? (
        <>
          <path d="M10.5 14.5 Q13 11.5 15.5 14.5" stroke={ink} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M20.5 14.5 Q23 11.5 25.5 14.5" stroke={ink} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      ) : mood === 1 ? (
        <>
          <path d="M10.5 13 L15 15" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M25.5 13 L21 15" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="13" cy="15" r="1.7" fill={ink} />
          <circle cx="23" cy="15" r="1.7" fill={ink} />
        </>
      )}
      {mood >= 4 && (
        <>
          <ellipse cx="9.5" cy="20.5" rx="2.4" ry="1.4" fill="#f39b89" opacity="0.45" />
          <ellipse cx="26.5" cy="20.5" rx="2.4" ry="1.4" fill="#f39b89" opacity="0.45" />
        </>
      )}
      <path d={mouth[mood]} stroke={ink} strokeWidth="1.9" fill="none" strokeLinecap="round" />
      {mood === 2 && <path d="M26 9 q1.5 3 0 4 q-1.5 -1 0 -4" fill="#9cc4e8" opacity="0.8" />}
    </svg>
  );
}

// ---------- decorative illustrations ----------

export function Sprig({ className = '', color = 'rgb(var(--sage))' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden fill="none">
      <path d="M12 72 C 30 52, 44 34, 66 10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {[
        [22, 58, -35], [30, 48, -30], [39, 38, -28], [48, 28, -24], [57, 19, -20],
      ].map(([x, y, r], i) => (
        <g key={i}>
          <ellipse cx={x - 5} cy={y - 3} rx="7" ry="3.2" transform={`rotate(${r - 20} ${x - 5} ${y - 3})`} fill={color} opacity="0.75" />
          <ellipse cx={x + 4} cy={y + 4} rx="7" ry="3.2" transform={`rotate(${r + 50} ${x + 4} ${y + 4})`} fill={color} opacity="0.55" />
        </g>
      ))}
    </svg>
  );
}

export function Blossom({ className = '', petal = 'rgb(var(--blush))', center = 'rgb(var(--butter))' }: { className?: string; petal?: string; center?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="20" cy="11" rx="6" ry="8.5" fill={petal} opacity="0.85" transform={`rotate(${a} 20 20)`} />
      ))}
      <circle cx="20" cy="20" r="4.5" fill={center} />
    </svg>
  );
}

export function SunArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden>
      <circle cx="60" cy="58" r="26" fill="rgb(var(--butter))" />
      {Array.from({ length: 9 }, (_, i) => {
        const a = Math.PI + (i * Math.PI) / 8;
        return <line key={i} x1={60 + Math.cos(a) * 33} y1={58 + Math.sin(a) * 33} x2={60 + Math.cos(a) * 42} y2={58 + Math.sin(a) * 42} stroke="rgb(var(--peach))" strokeWidth="3" strokeLinecap="round" />;
      })}
      <path d="M0 66 Q 30 56 60 66 T 120 64 V80 H0Z" fill="rgb(var(--sage))" opacity="0.7" />
      <path d="M0 72 Q 40 62 80 72 T 120 70 V80 H0Z" fill="rgb(var(--sage))" />
    </svg>
  );
}

export function MoonArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden>
      <path d="M52 14 A28 28 0 1 0 66 56 A22 22 0 1 1 52 14Z" fill="rgb(var(--lavender))" />
      {[[16, 18, 2], [64, 22, 1.5], [24, 66, 1.4], [70, 40, 1.2], [12, 44, 1]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="rgb(var(--powder))" />
      ))}
      <path d="M60 8 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5z" fill="rgb(var(--butter))" />
    </svg>
  );
}

export function NotebookArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden>
      <rect x="22" y="14" width="70" height="80" rx="8" fill="rgb(var(--peach))" transform="rotate(-6 57 54)" />
      <rect x="28" y="10" width="70" height="80" rx="8" fill="rgb(var(--card))" stroke="rgb(var(--line))" strokeWidth="2" />
      {[28, 40, 52, 64, 76].map((y) => (
        <line key={y} x1="40" y1={y} x2="88" y2={y} stroke="rgb(var(--line))" strokeWidth="2" strokeLinecap="round" />
      ))}
      <path d="M40 28 h30" stroke="rgb(var(--blush))" strokeWidth="3" strokeLinecap="round" />
      <path d="M100 30 l8 -8 4 4 -8 8z M98 36 l-2 6 6 -2" fill="rgb(var(--lavender))" />
      <g transform="translate(78 64) scale(0.6)">
        <Blossom />
      </g>
    </svg>
  );
}

export function WaterArt({ pct, className = '' }: { pct: number; className?: string }) {
  const level = 86 - Math.max(0, Math.min(1, pct)) * 70;
  return (
    <svg viewBox="0 0 70 100" className={className} aria-hidden>
      <defs>
        <linearGradient id="water-g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#bfe0f7" />
          <stop offset="1" stopColor="#7fb3e0" />
        </linearGradient>
        <clipPath id="glass-clip">
          <path d="M10 8 H60 L54 92 Q53 96 49 96 H21 Q17 96 16 92Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#glass-clip)">
        <rect x="0" y="0" width="70" height="100" fill="rgb(var(--sunk))" />
        <motion.g initial={{ y: 90 }} animate={{ y: level }} transition={{ type: 'spring', stiffness: 90, damping: 18 }}>
          <motion.path
            d="M-70 6 Q -52 0 -35 6 T 0 6 T 35 6 T 70 6 T 105 6 V120 H-70Z"
            fill="url(#water-g)"
            animate={{ x: [0, 35] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
          />
          <circle cx="24" cy="30" r="2" fill="#fff" opacity="0.5" />
          <circle cx="40" cy="44" r="1.4" fill="#fff" opacity="0.5" />
        </motion.g>
      </g>
      <path d="M10 8 H60 L54 92 Q53 96 49 96 H21 Q17 96 16 92Z" fill="none" stroke="rgb(var(--powder))" strokeWidth="2.5" />
      <path d="M17 16 L21 84" stroke="#fff" strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function TargetArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <circle cx="50" cy="54" r="38" fill="rgb(var(--blush))" opacity="0.6" />
      <circle cx="50" cy="54" r="27" fill="rgb(var(--card))" />
      <circle cx="50" cy="54" r="17" fill="rgb(var(--peach))" />
      <circle cx="50" cy="54" r="7" fill="rgb(var(--butter))" />
      <path d="M50 54 L82 16" stroke="rgb(var(--ink))" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M82 16 l-2 -9 M82 16 l9 -2" stroke="rgb(var(--lavender))" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function Confetti() {
  const colors = ['#f2a9b4', '#f6b48c', '#f1d475', '#a9cc9f', '#9cc4e8', '#bea9e3'];
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
      {Array.from({ length: 36 }, (_, i) => {
        const x = (i * 37) % 100;
        return (
          <motion.span
            key={i}
            className="absolute top-[-12px] block rounded-sm"
            style={{ left: `${x}%`, width: 6 + (i % 3) * 2, height: 10 - (i % 3) * 2, background: colors[i % colors.length] }}
            initial={{ y: -20, rotate: 0, opacity: 1 }}
            animate={{ y: '105vh', rotate: 360 + i * 20, x: ((i % 7) - 3) * 18, opacity: [1, 1, 0.6] }}
            transition={{ duration: 1.8 + (i % 5) * 0.25, ease: 'easeIn', delay: (i % 6) * 0.05 }}
          />
        );
      })}
    </div>
  );
}
