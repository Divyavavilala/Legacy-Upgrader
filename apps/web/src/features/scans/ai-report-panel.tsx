import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAiReport } from '@/hooks/use-scans';
import type { ScanStatus } from '@/api/types';

export function AiReportPanel({
  scanId,
  scanStatus,
}: {
  scanId: string;
  scanStatus: ScanStatus;
}) {
  const enabled = scanStatus === 'COMPLETED';
  const { data, isLoading, isError, error } = useAiReport(scanId, enabled);

  if (!enabled) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          AI report will be available after the scan completes.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'AI report not available yet.'}
          <p className="mt-2 text-xs">Reports generate asynchronously after scan completion.</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const content = data.report.content as Record<string, unknown> | null;
  const roadmap = Array.isArray(content?.modernizationRoadmap)
    ? (content.modernizationRoadmap as Array<{
        phase: number;
        title: string;
        description: string;
        durationWeeks?: number;
      }>)
    : [];

  const totalTokens = data.tokenUsage.reduce((s, t) => s + t.totalTokens, 0);

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-card to-accent/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>{data.report.title ?? 'AI Modernization Report'}</CardTitle>
          </div>
          <CardDescription>{data.report.summary}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{data.report.status}</Badge>
          <span>{data.insights.length} agent insights</span>
          <span>{totalTokens.toLocaleString()} tokens used</span>
        </CardContent>
      </Card>

      {roadmap.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modernization roadmap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {roadmap.map((phase) => (
              <div key={phase.phase} className="flex gap-3 rounded-md border border-border p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {phase.phase}
                </div>
                <div>
                  <p className="font-medium">{phase.title}</p>
                  <p className="text-sm text-muted-foreground">{phase.description}</p>
                  {phase.durationWeeks != null && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      ~{phase.durationWeeks} weeks
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data.insights.map((insight) => {
          const payload = insight.content as {
            insights?: string[];
            recommendations?: Array<{ title: string; description: string }>;
            risks?: string[];
          };
          return (
            <Card key={insight.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{insight.title}</CardTitle>
                <CardDescription>{insight.agentType.replace(/-/g, ' ')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {insight.summary && <p className="text-muted-foreground">{insight.summary}</p>}
                {payload.recommendations?.slice(0, 3).map((rec, i) => (
                  <div key={i} className="rounded border border-border p-2">
                    <p className="font-medium">{rec.title}</p>
                    <p className="text-xs text-muted-foreground">{rec.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
