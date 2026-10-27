import { useEffect, useRef, useState } from 'react';
import { fmt } from '../lib/nutrition';

const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = (t: number) => 1 - Math.pow(1 - t, 4);

/** Tweens from the previously shown value to `value`. */
export function useTween(value: number, duration = 700) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const current = useRef(value);

  useEffect(() => {
    if (reduced || current.current === value) {
      current.current = value;
      setShown(value);
      return;
    }
    from.current = current.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = from.current + (value - from.current) * ease(t);
      current.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return shown;
}

export function AnimatedNumber({ value, format = fmt, className }: { value: number; format?: (n: number) => string; className?: string }) {
  const v = useTween(value);
  return <span className={`tnum ${className ?? ''}`}>{format(v)}</span>;
}
