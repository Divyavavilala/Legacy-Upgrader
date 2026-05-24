import { useMemo, useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Finding, FindingCategory, FindingSeverity } from '@/api/types';

const SEVERITY_ORDER: FindingSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

const SEVERITY_VARIANT: Record<FindingSeverity, 'danger' | 'warning' | 'info' | 'secondary'> = {
  CRITICAL: 'danger',
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'info',
  INFO: 'secondary',
};

export function FindingsPanel({ findings }: { findings: Finding[] }) {
  const [severityFilter, setSeverityFilter] = useState<FindingSeverity | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<FindingCategory | 'ALL'>('ALL');

  const categories = useMemo(
    () => [...new Set(findings.map((f) => f.category))],
    [findings],
  );

  const grouped = useMemo(() => {
    const filtered = findings.filter((f) => {
      if (severityFilter !== 'ALL' && f.severity !== severityFilter) return false;
      if (categoryFilter !== 'ALL' && f.category !== categoryFilter) return false;
      return true;
    });

    const map = new Map<FindingSeverity, Finding[]>();
    for (const sev of SEVERITY_ORDER) {
      const items = filtered.filter((f) => f.severity === sev);
      if (items.length > 0) map.set(sev, items);
    }
    return map;
  }, [findings, severityFilter, categoryFilter]);

  if (findings.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No findings for this scan.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterChip active={severityFilter === 'ALL'} onClick={() => setSeverityFilter('ALL')}>
          All severities
        </FilterChip>
        {SEVERITY_ORDER.map((s) => (
          <FilterChip
            key={s}
            active={severityFilter === s}
            onClick={() => setSeverityFilter(s)}
          >
            {s}
          </FilterChip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterChip active={categoryFilter === 'ALL'} onClick={() => setCategoryFilter('ALL')}>
          All categories
        </FilterChip>
        {categories.map((c) => (
          <FilterChip
            key={c}
            active={categoryFilter === c}
            onClick={() => setCategoryFilter(c)}
          >
            {c}
          </FilterChip>
        ))}
      </div>

      {[...grouped.entries()].map(([severity, items]) => (
        <Card key={severity}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Badge variant={SEVERITY_VARIANT[severity]}>{severity}</Badge>
              <span className="text-muted-foreground">({items.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((f) => (
              <div key={f.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{f.title}</span>
                  <Badge variant="outline">{f.category}</Badge>
                </div>
                {f.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                )}
                {f.filePath && (
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{f.filePath}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border hover:bg-accent'
      }`}
    >
      {children}
    </button>
  );
}
