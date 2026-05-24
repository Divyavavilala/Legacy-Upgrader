import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScanStatusBadge } from './scan-status-badge';
import type { ScanProgress, ScanStatus } from '@/api/types';

const STAGES = [
  'initializing',
  'cloning',
  'framework-detection',
  'dependency-analysis',
  'architecture-analysis',
  'recommendation-generation',
] as const;

function formatStage(stage: string | null): string {
  if (!stage) return 'Waiting…';
  if (stage.startsWith('ai')) return `AI: ${stage.replace('ai', '').replace(/-/g, ' ')}`.trim();
  return stage.replace(/-/g, ' ');
}

export function ScanProgressPanel({
  progress,
  metadata,
}: {
  progress: ScanProgress;
  metadata?: Record<string, unknown> | null;
}) {
  const isActive: ScanStatus[] = ['PENDING', 'QUEUED', 'RUNNING'];
  const active = isActive.includes(progress.status);
  const aiStage = typeof metadata?.aiStage === 'string' ? metadata.aiStage : null;
  const aiProgress = typeof metadata?.aiProgress === 'number' ? metadata.aiProgress : null;
  const displayStage = aiStage ?? progress.currentStage;
  const displayProgress = aiProgress ?? progress.progress;

  const stageIndex = STAGES.indexOf(progress.currentStage as (typeof STAGES)[number]);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {active && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          <span className="font-medium">Scan progress</span>
        </div>
        <ScanStatusBadge status={progress.status} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{formatStage(displayStage)}</span>
          <span className="font-medium">{displayProgress}%</span>
        </div>
        <Progress value={displayProgress} />
      </div>

      {active && (
        <div className="grid gap-1 sm:grid-cols-3">
          {STAGES.map((stage, i) => {
            const done = stageIndex > i;
            const current = progress.currentStage === stage;
            return (
              <div
                key={stage}
                className={`rounded-md px-2 py-1 text-xs ${
                  current
                    ? 'bg-primary/15 font-medium text-primary'
                    : done
                      ? 'text-muted-foreground line-through'
                      : 'text-muted-foreground'
                }`}
              >
                {formatStage(stage)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
