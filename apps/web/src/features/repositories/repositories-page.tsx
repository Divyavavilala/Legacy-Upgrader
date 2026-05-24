import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScanStatusBadge } from '@/components/scans/scan-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AddRepositoryDialog } from './add-repository-dialog';
import { useRepositories } from '@/hooks/use-repositories';
import { formatRelativeTime } from '@/lib/utils';

export function RepositoriesPage() {
  const { data: repos, isLoading } = useRepositories();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Repositories</h1>
          <p className="text-muted-foreground">Manage connected legacy codebases</p>
        </div>
        <AddRepositoryDialog />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : repos?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No repositories yet.</p>
            <div className="mt-4">
              <AddRepositoryDialog />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {repos?.map((repo) => {
            const latest = repo.scans?.[0];
            return (
              <Card key={repo.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">
                      <Link to={`/repositories/${repo.id}`} className="hover:text-primary">
                        {repo.name}
                      </Link>
                    </CardTitle>
                    {latest && <ScanStatusBadge status={latest.status} />}
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{repo.slug}</p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {repo.url && (
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {repo.provider}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <p className="text-muted-foreground">
                    {repo._count?.scans ?? 0} scans
                    {latest && ` · last ${formatRelativeTime(latest.createdAt)}`}
                  </p>
                  <Link to={`/repositories/${repo.id}`}>
                    <Button variant="outline" size="sm">
                      View details
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
