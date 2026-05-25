import type { ModernizationMetrics } from '@/api/types';
import { cn } from '@/lib/utils';

const DIMENSIONS: Array<{ key: keyof ModernizationMetrics; label: string }> = [
  { key: 'dependencyFreshness', label: 'Dependencies' },
  { key: 'ciCdReadiness', label: 'CI/CD' },
  { key: 'dockerReadiness', label: 'Docker' },
  { key: 'typescriptAdoption', label: 'TypeScript' },
  { key: 'deprecatedUsage', label: 'Deprecation' },
  { key: 'architectureQuality', label: 'Architecture' },
  { key: 'securityScore', label: 'Security' },
  { key: 'testCoverageSignal', label: 'Tests' },
];

function barColor(value: number): string {
  if (value >= 75) return 'bg-emerald-500';
  if (value >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
}

export function MetricsGrid({ metrics }: { metrics: ModernizationMetrics }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {DIMENSIONS.map(({ key, label }) => {
        const value = metrics[key] as number;
        return (
          <div key={key} className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{value}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all', barColor(value))}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
