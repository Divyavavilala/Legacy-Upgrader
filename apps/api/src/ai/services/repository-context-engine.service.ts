import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { PrismaService } from '../../prisma';
import type { RepositoryAnalysisSnapshot } from '../../analysis/types/repository-snapshot.types';

@Injectable()
export class RepositoryContextEngineService {
  private readonly logger = new Logger(RepositoryContextEngineService.name);
  private readonly maxContextChars: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<EnvConfig, true>,
  ) {
    this.maxContextChars = config.get('AI_MAX_CONTEXT_CHARS', { infer: true });
  }

  async buildSnapshot(scanId: string): Promise<RepositoryAnalysisSnapshot> {
    const scan = await this.prisma.scan.findUniqueOrThrow({
      where: { id: scanId },
      include: {
        repository: true,
        findings: { orderBy: [{ severity: 'desc' }], take: 50 },
        dependencyIssues: { orderBy: [{ severity: 'desc' }], take: 30 },
        migrationRecommendations: { orderBy: [{ priority: 'desc' }], take: 20 },
      },
    });

    const metadata =
      scan.metadata && typeof scan.metadata === 'object'
        ? (scan.metadata as Record<string, unknown>)
        : {};

    const storedSnapshot = metadata.analysisSnapshot as RepositoryAnalysisSnapshot | undefined;

    const technologies =
      storedSnapshot?.technologies ??
      (Array.isArray(metadata.technologies) ? (metadata.technologies as string[]) : []);

    return {
      technologies,
      repositoryName: scan.repository.name,
      repositorySlug: scan.repository.slug,
      findingsSummary: scan.findings.map((f) => ({
        severity: f.severity,
        category: f.category,
        title: f.title,
        ruleId: f.ruleId ?? undefined,
      })),
      dependencyIssuesSummary: scan.dependencyIssues.map((d) => ({
        packageName: d.packageName,
        severity: d.severity,
        currentVersion: d.currentVersion ?? undefined,
      })),
      recommendationsSummary: scan.migrationRecommendations.map((r) => ({
        title: r.title,
        priority: r.priority,
      })),
      packageManifests: storedSnapshot?.packageManifests ?? [],
      configHighlights: storedSnapshot?.configHighlights ?? {},
    };
  }

  buildContextDocument(snapshot: RepositoryAnalysisSnapshot, focus: string): string {
    const sections: string[] = [
      `# Repository: ${snapshot.repositoryName} (${snapshot.repositorySlug})`,
      `## Focus: ${focus}`,
      `## Technologies\n${snapshot.technologies.join(', ') || 'unknown'}`,
      `## Findings (${snapshot.findingsSummary.length})`,
      ...snapshot.findingsSummary.map(
        (f) => `- [${f.severity}/${f.category}] ${f.title}${f.ruleId ? ` (${f.ruleId})` : ''}`,
      ),
      `## Dependency issues (${snapshot.dependencyIssuesSummary.length})`,
      ...snapshot.dependencyIssuesSummary.map(
        (d) => `- [${d.severity}] ${d.packageName}@${d.currentVersion ?? '?'}`,
      ),
      `## Existing recommendations (${snapshot.recommendationsSummary.length})`,
      ...snapshot.recommendationsSummary.map((r) => `- [${r.priority}] ${r.title}`),
    ];

    if (snapshot.packageManifests.length > 0) {
      sections.push('## Package manifests (prioritized)');
      for (const pkg of snapshot.packageManifests.slice(0, 5)) {
        const deps = Object.entries(pkg.dependencies).slice(0, 25);
        sections.push(
          `### ${pkg.path}\ndependencies: ${deps.map(([k, v]) => `${k}@${v}`).join(', ')}`,
        );
      }
    }

    if (Object.keys(snapshot.configHighlights).length > 0) {
      sections.push('## Config highlights');
      for (const [path, excerpt] of Object.entries(snapshot.configHighlights)) {
        sections.push(`### ${path}\n\`\`\`\n${excerpt.slice(0, 800)}\n\`\`\``);
      }
    }

    let document = sections.join('\n');
    if (document.length > this.maxContextChars) {
      document = `${document.slice(0, this.maxContextChars)}\n\n[context truncated for token budget]`;
      this.logger.debug(`Context truncated to ${this.maxContextChars} chars for focus=${focus}`);
    }

    return document;
  }
}
