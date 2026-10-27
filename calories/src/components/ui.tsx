import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { useEffect, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { fmt, fmt1, num } from '../lib/nutrition';
import { AnimatedNumber } from './AnimatedNumber';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[24px] border border-line bg-card ${className}`}>{children}</section>;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  const id = useId();
  return (
    <div className="flex rounded-2xl bg-raised p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`relative flex-1 rounded-xl font-medium transition-colors ${size === 'sm' ? 'py-1.5 text-[13px]' : 'py-2 text-sm'} ${
            value === o.value ? 'text-ink' : 'text-muted active:text-ink'
          }`}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${id}`}
              className="absolute inset-0 rounded-xl bg-white/[0.09] shadow-sm"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Numeric text input that keeps the raw string while typing (so "1." or "" are allowed). */
export function NumberInput({
  value,
  onChange,
  className = '',
  ...rest
}: { value: number; onChange: (n: number) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [text, setText] = useState(value ? String(round2(value)) : '');
  useEffect(() => {
    if (num(text) !== value) setText(value ? String(round2(value)) : '');
  }, [value]);
  return (
    <input
      inputMode="decimal"
      enterKeyHint="done"
      autoComplete="off"
      className={`input tnum ${className}`}
      value={text}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d.,]/g, '');
        setText(t);
        onChange(num(t));
      }}
      onFocus={(e) => e.target.select()}
      {...rest}
    />
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function Field({ label, children, hint, accent }: { label: string; children: ReactNode; hint?: ReactNode; accent?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
        {accent && <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />}
        {label}
        {hint && <span className="ml-auto text-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function Stepper({ value, onChange, step = 0.5, min = 0.25, suffix }: { value: number; onChange: (n: number) => void; step?: number; min?: number; suffix?: string }) {
  const dec = () => onChange(Math.max(min, round2(value - step)));
  const inc = () => onChange(round2(value + step));
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Less" className="step-btn" onClick={dec}>
        <Minus size={18} />
      </button>
      <div className="relative flex-1">
        <NumberInput value={value} onChange={(n) => onChange(n)} className="text-center text-lg font-semibold" aria-label="Quantity" />
        {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-faint">{suffix}</span>}
      </div>
      <button type="button" aria-label="More" className="step-btn" onClick={inc}>
        <Plus size={18} />
      </button>
    </div>
  );
}

export const MACRO_COLOR = { p: 'rgb(var(--protein))', c: 'rgb(var(--carbs))', f: 'rgb(var(--fat))' };
export const MACRO_LABEL = { p: 'Protein', c: 'Carbs', f: 'Fat' };

export function MacroBar({ k, value, target }: { k: 'p' | 'c' | 'f'; value: number; target: number }) {
  const pct = target > 0 ? value / target : 0;
  const left = target - value;
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-muted">{MACRO_LABEL[k]}</div>
      <div className="tnum mt-1 text-[15px] font-semibold tracking-tight">
        <AnimatedNumber value={value} />
        <span className="text-xs font-normal text-faint"> / {fmt(target)}g</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: MACRO_COLOR[k] }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, pct * 100)}%` }}
          transition={{ type: 'spring', stiffness: 70, damping: 18 }}
        />
      </div>
      <div className="tnum mt-1.5 text-[11px] text-faint">{left >= 0 ? `${fmt(left)}g left` : `${fmt(-left)}g over`}</div>
    </div>
  );
}

export function MacroLine({ p, c, f, className = '' }: { p: number; c: number; f: number; className?: string }) {
  return (
    <span className={`tnum inline-flex items-center gap-2 text-xs text-faint ${className}`}>
      <Dot c={MACRO_COLOR.p} />
      {fmt1(p)}
      <Dot c={MACRO_COLOR.c} />
      {fmt1(c)}
      <Dot c={MACRO_COLOR.f} />
      {fmt1(f)}
    </span>
  );
}

const Dot = ({ c }: { c: string }) => <span className="-mr-1 h-1.5 w-1.5 rounded-full" style={{ background: c }} />;
