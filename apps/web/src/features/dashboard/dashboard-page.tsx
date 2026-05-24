import type { ReactNode } from 'react';
import { Activity, AlertTriangle, FolderGit2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScanStatusBadge } from '@/components/scans/scan-status-badge';
import { useRepositories } from '@/hooks/use-repositories';
import { formatRelativeTime } from '@/lib/utils';
import type { Repository, ScanStatus } from '@/api/types';

function computeMetrics(repos: Repository[]) {
  let totalScans = 0;
  let activeScans = 0;
  let completedScans = 0;
  let totalFindings = 0;
  const recent: Array<{
    scanId: string;
    repoName: string;
    repoId: string;
    status: ScanStatus;
    progress: number;
    createdAt: string;
  }> = [];

  for (const repo of repos) {
    totalScans += repo._count?.scans ?? 0;
    const latest = repo.scans?.[0];
    if (latest) {
      if (['PENDING', 'QUEUED', 'RUNNING'].includes(latest.status)) activeScans += 1;
      if (latest.status === 'COMPLETED') completedScans += 1;
      totalFindings += 0;
      recent.push({
        scanId: latest.id,
        repoId: repo.id,
        repoName: repo.name,
        status: latest.status,
        progress: latest.progress,
        createdAt: latest.createdAt,
      });
    }
  }

  recent.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const modernizationScore =
    repos.length === 0
      ? 0
      : Math.round(
          (completedScans / Math.max(repos.length, 1)) * 70 +
            (repos.length > 0 ? 30 : 0) -
            activeScans * 5,
        );

  return {
    repoCount: repos.length,
    totalScans,
    activeScans,
    modernizationScore: Math.min(100, Math.max(0, modernizationScore)),
    totalFindings,
    recent: recent.slice(0, 8),
  };
}

export function DashboardPage() {
  const { data: repos, isLoading } = useRepositories();
  const metrics = computeMetrics(repos ?? []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Organization overview — repositories, scans, and modernization health
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Repositories"
          value={metrics.repoCount}
          icon={<FolderGit2 className="h-4 w-4 text-primary" />}
        />
        <MetricCard
          title="Total scans"
          value={metrics.totalScans}
          icon={<Activity className="h-4 w-4 text-primary" />}
        />
        <MetricCard
          title="Active scans"
          value={metrics.activeScans}
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
        />
        <MetricCard
          title="Modernization score"
          value={`${metrics.modernizationScore}%`}
          icon={<Sparkles className="h-4 w-4 text-primary" />}
          description="Based on scan completion coverage"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent scan activity</CardTitle>
            <CardDescription>Latest runs across your repositories</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No scans yet.{' '}
                <Link to="/repositories" className="text-primary hover:underline">
                  Add a repository
                </Link>{' '}
                to get started.
              </p>
            ) : (
              <ul className="space-y-3">
                {metrics.recent.map((item) => (
                  <li key={item.scanId}>
                    <Link
                      to={`/scans/${item.scanId}`}
                      className="flex items-center justify-between rounded-md border border-border p-3 transition-colors hover:bg-accent/50"
                    >
                      <div>
                        <p className="font-medium">{item.repoName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(item.createdAt)} · {item.progress}%
                        </p>
                      </div>
                      <ScanStatusBadge status={item.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Common workflows</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              to="/repositories"
              className="block rounded-md border border-border p-3 text-sm font-medium hover:bg-accent/50"
            >
              Manage repositories →
            </Link>
            <p className="text-sm text-muted-foreground">
              Connect Git repositories, trigger scans, and review AI-powered modernization
              reports with findings grouped by severity.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
