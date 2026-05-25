import { ExternalLink, Play, RefreshCw } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ScanProgressPanel } from '@/components/scans/scan-progress-panel';
import { ScanStatusBadge } from '@/components/scans/scan-status-badge';
import { GeneratedChangesPanel } from '@/components/modernization/generated-changes-panel';
import { MetricsGrid } from '@/components/modernization/metrics-grid';
import { ReadinessRing, RiskBadge } from '@/components/modernization/risk-badge';
import { ScanFailurePanel } from '@/components/modernization/scan-failure-panel';
import { TechBadgeList } from '@/components/modernization/tech-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FindingsPanel } from '@/features/scans/findings-panel';
import { DeleteRepositoryDialog } from './delete-repository-dialog';
import {
  useRepository,
  useRepositoryLatestScan,
  useTriggerScan,
} from '@/hooks/use-repositories';
import { useDownloadReport, useRetryScan } from '@/hooks/use-scan-actions';
import { useScanProgress } from '@/hooks/use-scans';
import { formatRelativeTime } from '@/lib/utils';
import type { ModernizationMetrics } from '@/api/types';

function getTechnologies(metadata: Record<string, unknown> | null | undefined): string[] {
  if (!metadata) return [];
  return Array.isArray(metadata.technologies) ? (metadata.technologies as string[]) : [];
}

export function RepositoryDetailPage() {
  const { id = '' } = useParams();
  const { data: repo, isLoading } = useRepository(id);
  const { data: scan, isLoading: scanLoading } = useRepositoryLatestScan(id);
  const { data: progress } = useScanProgress(scan?.id ?? '', scan?.status);
  const triggerScan = useTriggerScan(id);
  const retryScan = useRetryScan(id);
  const download = useDownloadReport();

  const hasActiveScan = scan && ['PENDING', 'QUEUED', 'RUNNING'].includes(scan.status);
  const technologies = useMemo(
    () => getTechnologies(scan?.metadata as Record<string, unknown> | undefined),
    [scan?.metadata],
  );

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  if (!repo) {
    return <p className="text-muted-foreground">Repository not found.</p>;
  }

  const metrics = scan?.metrics as ModernizationMetrics | undefined;
  const outputFiles = scan?.modernizedOutput ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <p className="text-sm text-muted-foreground">
            <Link to="/repositories" className="hover:text-primary">
              Repositories
            </Link>{' '}
            / <span className="font-mono">{repo.slug}</span>
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{repo.name}</h1>
          {repo.url && (
            <a
              href={repo.url.replace(/\.git$/, '')}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-sm text-primary hover:underline"
            >
              {repo.url}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-md border border-border/60 px-2 py-0.5">{repo.provider}</span>
            {repo.defaultBranch && <span>branch: {repo.defaultBranch}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => triggerScan.mutate()}
            disabled={triggerScan.isPending || Boolean(hasActiveScan)}
            className="bg-gradient-to-r from-primary to-cyan"
          >
            {triggerScan.isPending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {hasActiveScan ? 'Scan running…' : 'Run scan'}
          </Button>
          <DeleteRepositoryDialog repositoryId={repo.id} repositoryName={repo.name} />
        </div>
      </div>

      {scanLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : !scan ? (
        <Card className="glass-panel glow-card">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No scans yet. Run your first scan to analyze this legacy codebase.
          </CardContent>
        </Card>
      ) : (
        <>
          {scan.status === 'FAILED' && (
            <ScanFailurePanel
              scan={scan}
              isRetrying={retryScan.isPending}
              onRetry={() => retryScan.mutate(scan.id)}
            />
          )}

          {hasActiveScan && progress && (
            <ScanProgressPanel progress={progress} metadata={scan.metadata} />
          )}

          {scan.status === 'COMPLETED' && metrics && (
            <Card className="glass-panel glow-card border-primary/20">
              <CardContent className="flex flex-wrap items-center gap-6 p-4">
                <ReadinessRing value={metrics.overallReadiness} />
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Modernization readiness
                    </span>
                    <RiskBadge level={metrics.riskLevel} />
                    <ScanStatusBadge status={scan.status} />
                  </div>
                  <TechBadgeList technologies={technologies} />
                  <p className="text-xs text-muted-foreground">
                    {scan._count?.findings ?? 0} findings · completed{' '}
                    {scan.completedAt ? formatRelativeTime(scan.completedAt) : '—'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="h-auto flex-wrap gap-1 bg-card/60 p-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="findings">
                Findings ({scan._count?.findings ?? scan.findings?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="recommendations">
                Recommendations ({scan.migrationRecommendations?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="changes">Generated Changes ({outputFiles.length})</TabsTrigger>
              <TabsTrigger value="report">Download Report</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="glass-panel">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Health metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {metrics ? (
                      <MetricsGrid metrics={metrics} />
                    ) : (
                      <p className="text-sm text-muted-foreground">Metrics available after scan completes.</p>
                    )}
                  </CardContent>
                </Card>
                <Card className="glass-panel">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Dependency issues</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {(scan.dependencyIssues ?? []).slice(0, 6).map((d) => (
                      <div
                        key={d.id}
                        className="flex justify-between gap-2 rounded-md border border-border/50 px-2 py-1.5"
                      >
                        <span className="font-mono text-xs">{d.packageName}</span>
                        <span className="text-xs text-amber-400">{d.severity}</span>
                      </div>
                    ))}
                    {(scan.dependencyIssues?.length ?? 0) === 0 && (
                      <p className="text-muted-foreground">No dependency issues detected.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="findings">
              <FindingsPanel findings={scan.findings ?? []} />
            </TabsContent>

            <TabsContent value="recommendations">
              <div className="space-y-3">
                {(scan.migrationRecommendations ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recommendations yet.</p>
                ) : (
                  scan.migrationRecommendations?.map((rec) => (
                    <Card key={rec.id} className="glass-panel glow-card">
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{rec.title}</span>
                          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">
                            {rec.priority}
                          </span>
                          <span className="text-xs text-muted-foreground">{rec.effort} effort</span>
                        </div>
                        {rec.description && (
                          <p className="mt-2 text-sm text-muted-foreground">{rec.description}</p>
                        )}
                        {rec.targetStack && (
                          <p className="mt-1 text-xs text-cyan">→ {rec.targetStack}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="changes">
              <GeneratedChangesPanel
                files={outputFiles}
                downloading={download.isPending}
                onDownloadZip={() => download.mutate({ scanId: scan.id, format: 'zip' })}
              />
            </TabsContent>

            <TabsContent value="report">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="text-base">Export modernization report</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    disabled={scan.status !== 'COMPLETED' || download.isPending}
                    onClick={() => download.mutate({ scanId: scan.id, format: 'md' })}
                  >
                    Download Markdown
                  </Button>
                  <Button
                    variant="outline"
                    disabled={scan.status !== 'COMPLETED' || download.isPending}
                    onClick={() => download.mutate({ scanId: scan.id, format: 'pdf' })}
                  >
                    Download PDF
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-primary/90 to-cyan/80"
                    disabled={outputFiles.length === 0 || download.isPending}
                    onClick={() => download.mutate({ scanId: scan.id, format: 'zip' })}
                  >
                    Download output ZIP
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
