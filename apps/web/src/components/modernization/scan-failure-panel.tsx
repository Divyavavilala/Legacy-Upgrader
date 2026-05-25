import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ScanDetail } from '@/api/types';

export function ScanFailurePanel({
  scan,
  onRetry,
  isRetrying,
}: {
  scan: ScanDetail;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const meta = scan.metadata ?? {};
  const logs = Array.isArray(meta.failureLogs) ? (meta.failureLogs as string[]) : [];
  const failedStage = typeof meta.failedStage === 'string' ? meta.failedStage : scan.currentStage;

  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
          <div>
            <p className="font-semibold text-rose-300">Scan failed</p>
            <p className="mt-1 text-sm text-rose-200/90">
              {scan.errorMessage ?? 'An unknown error occurred'}
            </p>
            {failedStage && (
              <p className="mt-1 text-xs text-muted-foreground">
                Stage: <span className="font-mono">{failedStage}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setExpanded((e) => !e)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Logs
          </Button>
          <Button size="sm" onClick={onRetry} disabled={isRetrying}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            Retry scan
          </Button>
        </div>
      </div>
      {expanded && (
        <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-border/60 bg-background/50 p-3 font-mono text-xs text-muted-foreground">
          {logs.length > 0 ? logs.join('\n') : scan.errorMessage ?? 'No additional logs'}
        </pre>
      )}
    </div>
  );
}
