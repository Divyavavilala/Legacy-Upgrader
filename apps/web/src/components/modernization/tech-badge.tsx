import { cn } from '@/lib/utils';

const TECH_COLORS: Record<string, string> = {
  react: 'from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/30',
  node: 'from-emerald-500/20 to-green-500/20 text-emerald-300 border-emerald-500/30',
  typescript: 'from-blue-500/20 to-indigo-500/20 text-blue-300 border-blue-500/30',
  javascript: 'from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/30',
  docker: 'from-sky-500/20 to-cyan-500/20 text-sky-300 border-sky-500/30',
  vue: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30',
  angular: 'from-rose-500/20 to-red-500/20 text-rose-300 border-rose-500/30',
  default: 'from-primary/20 to-accent/20 text-foreground border-border',
};

function colorFor(tech: string): string {
  const key = Object.keys(TECH_COLORS).find((k) => tech.toLowerCase().includes(k));
  return TECH_COLORS[key ?? 'default']!;
}

export function TechBadge({ tech, className }: { tech: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border bg-gradient-to-r px-2 py-0.5 text-xs font-medium',
        colorFor(tech),
        className,
      )}
    >
      {tech}
    </span>
  );
}

export function TechBadgeList({ technologies }: { technologies: string[] }) {
  if (!technologies.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {technologies.slice(0, 5).map((t) => (
        <TechBadge key={t} tech={t} />
      ))}
      {technologies.length > 5 && (
        <span className="text-xs text-muted-foreground">+{technologies.length - 5}</span>
      )}
    </div>
  );
}
