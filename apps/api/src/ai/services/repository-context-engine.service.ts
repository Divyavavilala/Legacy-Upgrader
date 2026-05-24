import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { PrismaService } from '../../prisma';
import type { RepositoryAnalysisSnapshot } from '../../analysis/types/repository-snapshot.types';
import { chunkSections, type ContextChunk } from '../utils/context-compression.util';

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
    const chunks: ContextChunk[] = [
      {
        id: 'header',
        priority: 100,
        content: `# Repository: ${snapshot.repositoryName} (${snapshot.repositorySlug})\n## Focus: ${focus}\n## Technologies\n${snapshot.technologies.join(', ') || 'unknown'}`,
      },
    ];

    if (snapshot.packageManifests.length > 0) {
      const manifestLines = snapshot.packageManifests.slice(0, 5).map((pkg) => {
        const deps = Object.entries(pkg.dependencies).slice(0, 25);
        return `### ${pkg.path}\ndependencies: ${deps.map(([k, v]) => `${k}@${v}`).join(', ')}`;
      });
      chunks.push({
        id: 'manifests',
        priority: 95,
        content: `## Package manifests (prioritized)\n${manifestLines.join('\n')}`,
      });
    }

    const configEntries = Object.entries(snapshot.configHighlights);
    if (configEntries.length > 0) {
      const configLines = configEntries
        .slice(0, 12)
        .map(([path, excerpt]) => `### ${path}\n\`\`\`\n${excerpt.slice(0, 800)}\n\`\`\``);
      chunks.push({
        id: 'config',
        priority: 90,
        content: `## Config highlights\n${configLines.join('\n')}`,
      });
    }

    if (snapshot.dependencyIssuesSummary.length > 0) {
      chunks.push({
        id: 'dependencies',
        priority: 85,
        content: [
          `## Dependency issues (${snapshot.dependencyIssuesSummary.length})`,
          ...snapshot.dependencyIssuesSummary.map(
            (d) => `- [${d.severity}] ${d.packageName}@${d.currentVersion ?? '?'}`,
          ),
        ].join('\n'),
      });
    }

    if (snapshot.findingsSummary.length > 0) {
      chunks.push({
        id: 'findings',
        priority: 80,
        content: [
          `## Analyzer findings (${snapshot.findingsSummary.length})`,
          ...snapshot.findingsSummary.map(
            (f) =>
              `- [${f.severity}/${f.category}] ${f.title}${f.ruleId ? ` (${f.ruleId})` : ''}`,
          ),
        ].join('\n'),
      });
    }

    if (snapshot.recommendationsSummary.length > 0) {
      chunks.push({
        id: 'recommendations',
        priority: 70,
        content: [
          `## Existing recommendations (${snapshot.recommendationsSummary.length})`,
          ...snapshot.recommendationsSummary.map((r) => `- [${r.priority}] ${r.title}`),
        ].join('\n'),
      });
    }

    const document = chunkSections(chunks, this.maxContextChars);
    if (document.length >= this.maxContextChars - 32) {
      this.logger.debug(`Context at budget limit (${this.maxContextChars} chars) for focus=${focus}`);
    }

    return document;
  }
}
