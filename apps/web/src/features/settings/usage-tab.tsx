import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/sdk';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function UsageTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['entitlements'],
    queryFn: () => api.platform.entitlements(),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.plan.name} plan</CardTitle>
        <CardDescription>Usage for the current billing period.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <UsageBar
          label="Repositories"
          used={data.usage.repositories}
          limit={data.limits.maxRepositories}
        />
        <UsageBar
          label="Scans this month"
          used={data.usage.scans}
          limit={data.limits.maxScansPerMonth}
        />
        <UsageBar
          label="AI tokens this month"
          used={data.usage.aiTokens}
          limit={data.limits.maxAiTokensPerMonth}
        />
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Worker jobs</p>
            <p className="font-medium">{data.usage.workerJobs}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Report retention</p>
            <p className="font-medium">{data.limits.reportRetentionDays} days</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
