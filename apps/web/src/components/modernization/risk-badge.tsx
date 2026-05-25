import { cn } from '@/lib/utils';

const STYLES = {
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  critical: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

export function RiskBadge({ level }: { level: keyof typeof STYLES }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
        STYLES[level],
      )}
    >
      {level} risk
    </span>
  );
}

export function ReadinessRing({ value }: { value: number }) {
  const color =
    value >= 75 ? 'text-emerald-400' : value >= 50 ? 'text-amber-400' : 'text-rose-400';
  return (
    <div className="relative flex h-14 w-14 items-center justify-center">
      <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          className="stroke-border"
          strokeWidth="3"
        />
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          className={color}
          strokeWidth="3"
          strokeDasharray={`${value} 100`}
          strokeLinecap="round"
          pathLength="100"
        />
      </svg>
      <span className={cn('absolute text-sm font-bold', color)}>{value}%</span>
    </div>
  );
}
