import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/api/sdk';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/utils';

export function AuditTab() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', search],
    queryFn: () => api.audit.search({ search: search || undefined, pageSize: 50 }),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit logs</CardTitle>
        <Input
          placeholder="Search by resource…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data?.items.map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap justify-between gap-2 rounded-md border border-border p-3 text-sm"
            >
              <div>
                <p className="font-medium">{log.action}</p>
                <p className="text-xs text-muted-foreground">
                  {log.resourceType}
                  {log.resourceId ? ` · ${log.resourceId}` : ''}
                  {log.user ? ` · ${log.user.email}` : ''}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(log.createdAt)}
              </span>
            </div>
          ))}
          {data?.items.length === 0 && (
            <p className="text-sm text-muted-foreground">No audit events found.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
