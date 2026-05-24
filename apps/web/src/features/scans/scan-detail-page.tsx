import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ScanProgressPanel } from '@/components/scans/scan-progress-panel';
import { ScanStatusBadge } from '@/components/scans/scan-status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AiReportPanel } from './ai-report-panel';
import { FindingsPanel } from './findings-panel';
import { scanKeys, useScan, useScanProgress } from '@/hooks/use-scans';

export function ScanDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const { data: scan, isLoading } = useScan(id);
  const { data: progress } = useScanProgress(id, scan?.status);
  const completedNotified = useRef(false);

  useEffect(() => {
    if (progress?.status === 'COMPLETED' && !completedNotified.current) {
      completedNotified.current = true;
      void queryClient.invalidateQueries({ queryKey: scanKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: scanKeys.aiReport(id) });
      toast.success('Scan completed', {
        description: 'Findings and AI report are ready to review.',
      });
    }
  }, [progress?.status, id, queryClient]);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!scan) {
    return <p className="text-muted-foreground">Scan not found.</p>;
  }

  const displayProgress = progress ?? {
    status: scan.status,
    progress: scan.progress,
    currentStage: scan.currentStage,
    startedAt: scan.startedAt,
    completedAt: scan.completedAt,
  };

  const dependencyFindings = scan.findings.filter((f) => f.category === 'DEPENDENCY');
  const architectureFindings = scan.findings.filter((f) => f.category === 'ARCHITECTURE');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to={`/repositories/${scan.repository.id}`} className="hover:text-primary">
            {scan.repository.name}
          </Link>{' '}
          / scan {scan.id.slice(0, 8)}…
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Scan results</h1>
          <ScanStatusBadge status={scan.status} />
        </div>
      </div>

      <ScanProgressPanel
        progress={displayProgress}
        metadata={scan.metadata as Record<string, unknown> | null}
      />

      {scan.errorMessage && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {scan.errorMessage}
        </p>
      )}

      <Tabs defaultValue="findings">
        <TabsList>
          <TabsTrigger value="findings">
            Findings ({scan._count.findings})
          </TabsTrigger>
          <TabsTrigger value="dependencies">
            Dependencies ({dependencyFindings.length})
          </TabsTrigger>
          <TabsTrigger value="architecture">
            Architecture ({architectureFindings.length})
          </TabsTrigger>
          <TabsTrigger value="ai">AI report</TabsTrigger>
        </TabsList>

        <TabsContent value="findings">
          <FindingsPanel findings={scan.findings} />
        </TabsContent>
        <TabsContent value="dependencies">
          <FindingsPanel findings={dependencyFindings} />
        </TabsContent>
        <TabsContent value="architecture">
          <FindingsPanel findings={architectureFindings} />
        </TabsContent>
        <TabsContent value="ai">
          <AiReportPanel scanId={scan.id} scanStatus={scan.status} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
