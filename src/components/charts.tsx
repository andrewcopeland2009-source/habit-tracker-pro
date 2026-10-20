import type { ReactNode } from 'react';

/** Small tooltip shell shared by every Recharts chart. */
export function ChartTip({ active, payload, render }: { active?: boolean; payload?: { payload: Record<string, unknown> }[]; render: (p: any) => ReactNode }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-[11px] font-medium text-ink shadow-soft">{render(payload[0].payload)}</div>;
}

export const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 10, fill: 'rgb(var(--muted))' },
} as const;

export const gridStroke = 'rgb(var(--line))';
