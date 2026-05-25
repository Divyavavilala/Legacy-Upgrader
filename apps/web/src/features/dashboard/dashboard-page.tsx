import { ArrowRight, FolderGit2, Scan, Shield, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScanStatusBadge } from '@/components/scans/scan-status-badge';
import { ReadinessRing, RiskBadge } from '@/components/modernization/risk-badge';
import { TechBadgeList } from '@/components/modernization/tech-badge';
import { AddRepositoryDialog } from '@/features/repositories/add-repository-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRepositories } from '@/hooks/use-repositories';
import { formatRelativeTime } from '@/lib/utils';
import type { ModernizationMetrics, Repository } from '@/api/types';

function aggregateMetrics(repos: Repository[]) {
  let totalFindings = 0;
  let activeScans = 0;
  let completedScans = 0;
  let readinessSum = 0;
  let readinessCount = 0;
  const recent: Array<{
    scanId: string;
    repoId: string;
    repoName: string;
    status: string;
    progress: number;
    createdAt: string;
    findings: number;
    technologies: string[];
    metrics: ModernizationMetrics | null;
  }> = [];

  for (const repo of repos) {
    const latest = repo.scans?.[0];
    if (!latest) continue;
    totalFindings += latest._count?.findings ?? 0;
    if (['PENDING', 'QUEUED', 'RUNNING'].includes(latest.status)) activeScans += 1;
    if (latest.status === 'COMPLETED') completedScans += 1;

    const meta =
      latest.metadata && typeof latest.metadata === 'object'
        ? (latest.metadata as Record<string, unknown>)
        : {};
    const technologies = Array.isArray(meta.technologies)
      ? (meta.technologies as string[])
      : [];
    const metrics = meta.metrics as ModernizationMetrics | undefined;
    if (metrics) {
      readinessSum += metrics.overallReadiness;
      readinessCount += 1;
    }

    recent.push({
      scanId: latest.id,
      repoId: repo.id,
      repoName: repo.name,
      status: latest.status,
      progress: latest.progress,
      createdAt: latest.createdAt,
      findings: latest._count?.findings ?? 0,
      technologies,
      metrics: metrics ?? null,
    });
  }

  recent.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    repoCount: repos.length,
    totalFindings,
    activeScans,
    completedScans,
    avgReadiness: readinessCount ? Math.round(readinessSum / readinessCount) : null,
    recent: recent.slice(0, 8),
  };
}

export function DashboardPage() {
  const { data: repos, isLoading } = useRepositories();
  const metrics = aggregateMetrics(repos ?? []);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Legacy <span className="gradient-text">Modernization</span>
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Paste a repo URL, run a scan, review findings and generated upgrades, then download
            your modernization package.
          </p>
        </div>
        <AddRepositoryDialog />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Repositories"
          value={metrics.repoCount}
          icon={<FolderGit2 className="h-4 w-4 text-cyan" />}
        />
        <StatCard
          label="Active scans"
          value={metrics.activeScans}
          icon={<Scan className="h-4 w-4 text-primary" />}
          highlight={metrics.activeScans > 0}
        />
        <StatCard
          label="Total findings"
          value={metrics.totalFindings}
          icon={<Shield className="h-4 w-4 text-amber" />}
        />
        <StatCard
          label="Avg readiness"
          value={metrics.avgReadiness !== null ? `${metrics.avgReadiness}%` : '—'}
          icon={<Zap className="h-4 w-4 text-emerald" />}
          sub="From completed scan metrics"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="glass-panel glow-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No scans yet. Add a repository to start modernizing.
              </p>
            ) : (
              <ul className="space-y-2">
                {metrics.recent.map((item) => (
                  <li key={item.scanId}>
                    <Link
                      to={`/repositories/${item.repoId}`}
                      className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-all hover:border-primary/30 hover:bg-accent/30"
                    >
                      {item.metrics ? (
                        <ReadinessRing value={item.metrics.overallReadiness} />
                      ) : (
                        <div className="h-14 w-14" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{item.repoName}</p>
                        <div className="mt-1">
                          <TechBadgeList technologies={item.technologies} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.findings} findings · {formatRelativeTime(item.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <ScanStatusBadge status={item.status as import('@/api/types').ScanStatus} />
                        {item.metrics && <RiskBadge level={item.metrics.riskLevel} />}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-primary/20 bg-gradient-to-br from-primary/5 to-cyan/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick start</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Step n={1} text="Paste a GitHub/GitLab URL" />
            <Step n={2} text="Run the analysis pipeline" />
            <Step n={3} text="Review findings & generated changes" />
            <Step n={4} text="Download report + ZIP output" />
            <Link
              to="/repositories"
              className="mt-2 inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              View all repositories
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  sub,
  highlight,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`glass-panel ${highlight ? 'border-primary/40 shadow-[0_0_20px_oklch(0.72_0.19_285/0.12)]' : ''}`}
    >
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
        {icon}
      </CardContent>
    </Card>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
        {n}
      </span>
      <span className="text-muted-foreground">{text}</span>
    </div>
  );
}
