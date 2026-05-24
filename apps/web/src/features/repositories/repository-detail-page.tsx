import { Play, RefreshCw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ScanStatusBadge } from '@/components/scans/scan-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useRepository,
  useRepositoryScans,
  useTriggerScan,
} from '@/hooks/use-repositories';
import { formatRelativeTime } from '@/lib/utils';

export function RepositoryDetailPage() {
  const { id = '' } = useParams();
  const { data: repo, isLoading } = useRepository(id);
  const { data: scans, isLoading: scansLoading } = useRepositoryScans(id);
  const triggerScan = useTriggerScan(id);

  const hasActiveScan = scans?.some((s) =>
    ['PENDING', 'QUEUED', 'RUNNING'].includes(s.status),
  );

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!repo) {
    return <p className="text-muted-foreground">Repository not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link to="/repositories" className="hover:text-primary">
              Repositories
            </Link>{' '}
            / {repo.slug}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{repo.name}</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{repo.url}</p>
        </div>
        <Button
          onClick={() => triggerScan.mutate()}
          disabled={triggerScan.isPending || hasActiveScan}
        >
          {triggerScan.isPending ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {hasActiveScan ? 'Scan in progress' : 'Trigger scan'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scan history</CardTitle>
        </CardHeader>
        <CardContent>
          {scansLoading ? (
            <Skeleton className="h-32" />
          ) : scans?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scans yet. Trigger your first scan.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Scan</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Progress</th>
                    <th className="pb-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {scans?.map((scan) => (
                    <tr key={scan.id} className="border-b border-border/50">
                      <td className="py-3 pr-4">
                        <Link
                          to={`/scans/${scan.id}`}
                          className="font-mono text-primary hover:underline"
                        >
                          {scan.id.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <ScanStatusBadge status={scan.status} />
                      </td>
                      <td className="py-3 pr-4">{scan.progress}%</td>
                      <td className="py-3 text-muted-foreground">
                        {formatRelativeTime(scan.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
