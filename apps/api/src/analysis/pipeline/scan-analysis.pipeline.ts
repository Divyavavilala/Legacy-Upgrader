import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { RepositoryScanJobPayload } from '@legacyupgrader/queue-constants';
import { PrismaService } from '../../prisma';
import type { ScanStage } from '../../scans/constants/scan-stages';
import { ArchitectureAnalyzer } from '../architecture/architecture-analyzer.service';
import { DependencyAnalyzer } from '../dependency/dependency-analyzer.service';
import { FrameworkAnalyzer } from '../framework/framework-analyzer.service';
import { GitAnalyzer } from '../git/git-analyzer.service';
import { RecommendationEngine } from '../recommendation/recommendation-engine.service';
import type { ScanAnalysisContext } from '../types/scan-analysis.types';
import { WorkspaceManagerService } from '../workspace/workspace-manager.service';
import { ScanProgressService } from './scan-progress.service';

interface PipelineStep {
  stage: ScanStage;
  run: (context: ScanAnalysisContext) => Promise<void>;
}

@Injectable()
export class ScanAnalysisPipeline {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceManager: WorkspaceManagerService,
    private readonly progressService: ScanProgressService,
    private readonly gitAnalyzer: GitAnalyzer,
    private readonly frameworkAnalyzer: FrameworkAnalyzer,
    private readonly dependencyAnalyzer: DependencyAnalyzer,
    private readonly architectureAnalyzer: ArchitectureAnalyzer,
    private readonly recommendationEngine: RecommendationEngine,
  ) {}

  async execute(payload: RepositoryScanJobPayload): Promise<ScanAnalysisContext> {
    const repository = await this.prisma.repository.findUnique({
      where: { id: payload.repositoryId },
    });

    if (!repository?.url) {
      throw new Error('Repository URL is not configured');
    }

    const branch = payload.branch ?? repository.defaultBranch ?? 'main';
    const paths = await this.workspaceManager.ensureWorkspace(payload.scanId);

    const context: ScanAnalysisContext = {
      scanId: payload.scanId,
      repositoryId: payload.repositoryId,
      organizationId: payload.organizationId,
      gitUrl: repository.url,
      branch,
      workspaceRoot: paths.workspaceRoot,
      repositoryPath: paths.repositoryPath,
      startedAt: Date.now(),
      technologies: [],
      findings: [],
      dependencyIssues: [],
      recommendations: [],
      packageJsonFiles: [],
      metadata: {},
      cancelled: false,
    };

    const steps: PipelineStep[] = [
      { stage: 'cloning', run: (ctx) => this.gitAnalyzer.analyze(ctx) },
      { stage: 'framework-detection', run: (ctx) => this.frameworkAnalyzer.analyze(ctx) },
      { stage: 'dependency-analysis', run: (ctx) => this.dependencyAnalyzer.analyze(ctx) },
      { stage: 'architecture-analysis', run: (ctx) => this.architectureAnalyzer.analyze(ctx) },
      { stage: 'recommendation-generation', run: (ctx) => this.recommendationEngine.analyze(ctx) },
    ];

    await this.progressService.markRunning(payload.scanId, 'initializing');
    await this.progressService.updateStage(payload.scanId, 'initializing');

    for (const step of steps) {
      await this.progressService.updateStage(payload.scanId, step.stage);
      await step.run(context);
    }

    await this.persistResults(context);

    return context;
  }

  private async persistResults(context: ScanAnalysisContext): Promise<void> {
    if (context.commitSha) {
      await this.prisma.scan.update({
        where: { id: context.scanId },
        data: { commitSha: context.commitSha },
      });
    }

    if (context.findings.length > 0) {
      await this.prisma.finding.createMany({
        data: context.findings.map((finding) => ({
          scanId: context.scanId,
          severity: finding.severity,
          category: finding.category,
          title: finding.title,
          description: finding.description,
          filePath: finding.filePath,
          lineStart: finding.lineStart,
          ruleId: finding.ruleId,
          fingerprint: `${context.scanId}:${finding.fingerprint}`,
          metadata: {
            ...(finding.metadata ?? {}),
            source: 'legacy-analyzer-v1',
          } as Prisma.InputJsonValue,
        })),
      });
    }

    if (context.dependencyIssues.length > 0) {
      await this.prisma.dependencyIssue.createMany({
        data: context.dependencyIssues.map((issue) => ({
          scanId: context.scanId,
          packageName: issue.packageName,
          currentVersion: issue.currentVersion,
          recommendedVersion: issue.recommendedVersion,
          severity: issue.severity,
          ecosystem: issue.ecosystem,
          isDirect: issue.isDirect ?? true,
          cveIds: issue.cveIds ?? [],
          ...(issue.metadata
            ? { metadata: issue.metadata as Prisma.InputJsonValue }
            : {}),
        })),
      });
    }

    if (context.recommendations.length > 0) {
      await this.prisma.migrationRecommendation.createMany({
        data: context.recommendations.map((rec) => ({
          repositoryId: context.repositoryId,
          scanId: context.scanId,
          title: rec.title,
          description: rec.description,
          priority: rec.priority,
          effort: rec.effort,
          targetStack: rec.targetStack,
          ...(rec.metadata ? { metadata: rec.metadata as Prisma.InputJsonValue } : {}),
        })),
      });
    }
  }
}
