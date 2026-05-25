import { useState } from 'react';
import { Download, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GeneratedOutputFile } from '@/api/types';
import { cn } from '@/lib/utils';

export function GeneratedChangesPanel({
  files,
  onDownloadZip,
  downloading,
}: {
  files: GeneratedOutputFile[];
  onDownloadZip: () => void;
  downloading: boolean;
}) {
  const [selected, setSelected] = useState(0);

  if (files.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No generated output yet. Complete a scan to produce modernization artifacts.
      </p>
    );
  }

  const file = files[selected]!;

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <div className="space-y-1 overflow-auto rounded-lg border border-border/60 bg-background/40 p-2 max-h-[480px]">
        {files.map((f, i) => (
          <button
            key={f.path}
            type="button"
            onClick={() => setSelected(i)}
            className={cn(
              'flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors',
              i === selected ? 'bg-primary/15 text-foreground' : 'hover:bg-accent/50 text-muted-foreground',
            )}
          >
            <FileCode className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="break-all font-mono">{f.path.replace('modernized-output/', '')}</span>
          </button>
        ))}
      </div>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-sm">{file.path}</p>
            <p className="text-xs text-muted-foreground">
              <span
                className={cn(
                  'mr-2 rounded px-1.5 py-0.5',
                  file.changeType === 'added' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400',
                )}
              >
                {file.changeType}
              </span>
              {file.description}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onDownloadZip} disabled={downloading}>
            <Download className="mr-2 h-4 w-4" />
            {downloading ? 'Preparing…' : 'Download ZIP'}
          </Button>
        </div>
        <pre className="max-h-[420px] overflow-auto rounded-lg border border-border/60 bg-background/60 p-4 font-mono text-xs leading-relaxed">
          {file.content}
        </pre>
      </div>
    </div>
  );
}
