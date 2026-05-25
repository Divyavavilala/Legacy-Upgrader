import { ExternalLink, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScanStatusBadge } from '@/components/scans/scan-status-badge';
import { ReadinessRing, RiskBadge } from '@/components/modernization/risk-badge';
import { TechBadgeList } from '@/components/modernization/tech-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AddRepositoryDialog } from './add-repository-dialog';
import { useRepositories } from '@/hooks/use-repositories';
import { formatRelativeTime } from '@/lib/utils';
import type { ModernizationMetrics, Repository } from '@/api/types';

function extractTech(repo: Repository): string[] {
  const meta = repo.scans?.[0]?.metadata;
  if (!meta || typeof meta !== 'object') return [];
  return Array.isArray(meta.technologies) ? (meta.technologies as string[]) : [];
}

function extractMetrics(repo: Repository): ModernizationMetrics | null {
  const meta = repo.scans?.[0]?.metadata;
  if (!meta || typeof meta !== 'object') return null;
  const m = meta.metrics as ModernizationMetrics | undefined;
  return m ?? null;
}

export function RepositoriesPage() {
  const { data: repos, isLoading } = useRepositories();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return repos ?? [];
    return (repos ?? []).filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        (r.url?.toLowerCase().includes(q) ?? false),
    );
  }, [repos, query]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="gradient-text">Repositories</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload legacy repos · scan · modernize · download
          </p>
        </div>
        <AddRepositoryDialog />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search repositories…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass-panel">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <p className="text-muted-foreground">No repositories yet.</p>
            <div className="mt-4">
              <AddRepositoryDialog />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((repo) => {
            const latest = repo.scans?.[0];
            const tech = extractTech(repo);
            const metrics = extractMetrics(repo);
            const findingsCount = latest?._count?.findings ?? 0;

            return (
              <Card key={repo.id} className="glass-panel glow-card group overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={`/repositories/${repo.id}`}
                        className="font-semibold hover:text-primary"
                      >
                        {repo.name}
                      </Link>
                      <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                        {repo.slug}
                      </p>
                    </div>
                    {metrics ? (
                      <ReadinessRing value={metrics.overallReadiness} />
                    ) : latest ? (
                      <ScanStatusBadge status={latest.status} />
                    ) : null}
                  </div>

                  <div className="mt-3">
                    <TechBadgeList technologies={tech} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {metrics && <RiskBadge level={metrics.riskLevel} />}
                    <span>{findingsCount} findings</span>
                    {repo.defaultBranch && <span>· {repo.defaultBranch}</span>}
                    {latest && <span>· {formatRelativeTime(latest.createdAt)}</span>}
                  </div>

                  {repo.url && (
                    <a
                      href={repo.url.replace(/\.git$/, '')}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {repo.provider}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  <Link to={`/repositories/${repo.id}`} className="mt-3 block">
                    <Button variant="outline" size="sm" className="w-full group-hover:border-primary/40">
                      Open workspace
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
