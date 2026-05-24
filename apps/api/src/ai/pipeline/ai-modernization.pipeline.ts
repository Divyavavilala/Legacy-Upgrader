import { Injectable, Logger } from '@nestjs/common';
import { ModernizationReportStatus, type Prisma } from '@prisma/client';
import type {
  AiArchitectureAnalysisJobPayload,
  AiModernizationJobPayload,
  AiSecurityReviewJobPayload,
} from '@legacyupgrader/queue-constants';
import { ArchitectureReviewAgent } from '../agents/architecture-review.agent';
import { BackendMigrationAgent } from '../agents/backend-migration.agent';
import { DependencyModernizationAgent } from '../agents/dependency-modernization.agent';
import { DevOpsModernizationAgent } from '../agents/devops-modernization.agent';
import { FrontendMigrationAgent } from '../agents/frontend-migration.agent';
import { SecurityReviewAgent } from '../agents/security-review.agent';
import type { AgentRunContext } from '../agents/base-ai.agent';
import type { BaseAiAgent } from '../agents/base-ai.agent';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { RepositoryContextEngineService } from '../services/repository-context-engine.service';
import { PrismaService } from '../../prisma';
import type {
  AgentInsightPayload,
  AiAgentType,
  ModernizationReportContent,
} from '../types/ai.types';

type AiJobPayload =
  | AiModernizationJobPayload
  | AiSecurityReviewJobPayload
  | AiArchitectureAnalysisJobPayload;

@Injectable()
export class AiModernizationPipeline {
  private readonly logger = new Logger(AiModernizationPipeline.name);

  private readonly allAgents: BaseAiAgent[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly contextEngine: RepositoryContextEngineService,
    private readonly providerRegistry: AiProviderRegistry,
    dependencyAgent: DependencyModernizationAgent,
    architectureAgent: ArchitectureReviewAgent,
    securityAgent: SecurityReviewAgent,
    frontendAgent: FrontendMigrationAgent,
    backendAgent: BackendMigrationAgent,
    devopsAgent: DevOpsModernizationAgent,
  ) {
    this.allAgents = [
      dependencyAgent,
      architectureAgent,
      securityAgent,
      frontendAgent,
      backendAgent,
      devopsAgent,
    ];
  }

  async runFullModernization(payload: AiModernizationJobPayload): Promise<string> {
    return this.execute(
      payload,
      this.allAgents.map((agent) => agent.agentType),
    );
  }

  async runSecurityReview(payload: AiSecurityReviewJobPayload): Promise<string> {
    return this.execute(payload, ['security-review'], false);
  }

  async runArchitectureAnalysis(payload: AiArchitectureAnalysisJobPayload): Promise<string> {
    return this.execute(
      payload,
      ['architecture-review', 'backend-migration', 'devops-modernization'],
      false,
    );
  }

  private async execute(
    payload: AiJobPayload,
    agentTypes: AiAgentType[],
    publishReport = true,
  ): Promise<string> {
    const report = await this.ensureReport(payload.scanId, payload.reportId);

    await this.prisma.modernizationReport.update({
      where: { id: report.id },
      data: { status: ModernizationReportStatus.GENERATING },
    });

    const snapshot = await this.contextEngine.buildSnapshot(payload.scanId);
    const agentCtx: AgentRunContext = {
      scanId: payload.scanId,
      organizationId: payload.organizationId,
      repositoryId: payload.repositoryId,
      snapshot,
    };

    const insights: Array<{ agentType: AiAgentType; payload: AgentInsightPayload }> = [];

    for (const agentType of agentTypes) {
      const agent = this.allAgents.find((candidate) => candidate.agentType === agentType);
      if (!agent) continue;

      this.logger.log(`Running agent ${agentType} for scan ${payload.scanId}`);
      const result = await agent.run(agentCtx);
      insights.push({ agentType, payload: result });

      const existingInsight = await this.prisma.aiInsight.findFirst({
        where: { scanId: payload.scanId, agentType },
      });

      if (existingInsight) {
        await this.prisma.aiInsight.update({
          where: { id: existingInsight.id },
          data: {
            title: result.title,
            summary: result.summary,
            content: result as unknown as Prisma.InputJsonValue,
            confidence: result.confidence,
          },
        });
      } else {
        await this.prisma.aiInsight.create({
          data: {
            scanId: payload.scanId,
            agentType,
            title: result.title,
            summary: result.summary,
            content: result as unknown as Prisma.InputJsonValue,
            confidence: result.confidence,
          },
        });
      }

      for (const rec of result.recommendations) {
        await this.prisma.migrationRecommendation.create({
          data: {
            repositoryId: payload.repositoryId,
            scanId: payload.scanId,
            title: rec.title,
            description: rec.description,
            priority: rec.priority,
            effort: rec.effort,
            targetStack: rec.targetStack,
            metadata: {
              source: 'ai-agent',
              agentType,
            } as Prisma.InputJsonValue,
          },
        });
      }
    }

    if (publishReport) {
      const primaryProvider = this.providerRegistry.resolvePrimaryProvider();
      const reportContent = this.buildReportContent(insights, primaryProvider.name, 'composite');

      await this.prisma.modernizationReport.update({
        where: { id: report.id },
        data: {
          status: ModernizationReportStatus.PUBLISHED,
          title: `AI Modernization Report — ${snapshot.repositoryName}`,
          summary: reportContent.executiveSummary,
          content: reportContent as unknown as Prisma.InputJsonValue,
          publishedAt: new Date(),
        },
      });

      const scan = await this.prisma.scan.findUnique({
        where: { id: payload.scanId },
        select: { metadata: true },
      });
      const priorMeta =
        scan?.metadata && typeof scan.metadata === 'object'
          ? (scan.metadata as Record<string, unknown>)
          : {};

      await this.prisma.scan.update({
        where: { id: payload.scanId },
        data: {
          metadata: {
            ...priorMeta,
            aiCompleted: true,
            aiReportId: report.id,
            aiProvider: primaryProvider.name,
          },
        },
      });

      this.logger.log(`AI report ${report.id} published for scan ${payload.scanId}`);
    } else {
      this.logger.log(`AI agents completed for scan ${payload.scanId} (insights only)`);
    }

    return report.id;
  }

  private async ensureReport(scanId: string, reportId?: string) {
    if (reportId) {
      return this.prisma.modernizationReport.findUniqueOrThrow({ where: { id: reportId } });
    }

    const existing = await this.prisma.modernizationReport.findUnique({ where: { scanId } });
    if (existing) return existing;

    return this.prisma.modernizationReport.create({
      data: { scanId, status: ModernizationReportStatus.DRAFT },
    });
  }

  private buildReportContent(
    insights: Array<{ agentType: AiAgentType; payload: AgentInsightPayload }>,
    provider: string,
    model: string,
  ): ModernizationReportContent {
    const allRisks = insights.flatMap((i) => i.payload.risks);
    const allRecs = insights.flatMap((i) => i.payload.recommendations.map((r) => r.title));

    const agentSummaries: Record<string, string> = {};
    for (const { agentType, payload } of insights) {
      agentSummaries[agentType] = payload.summary;
    }

    return {
      executiveSummary: insights.map((i) => i.payload.summary).join('\n\n'),
      modernizationRoadmap: allRecs.slice(0, 8).map((title, index) => ({
        phase: index + 1,
        title,
        description: `Deliverable from AI modernization phase ${index + 1}`,
        durationWeeks: 2 + index,
      })),
      technicalDebtSummary: insights
        .flatMap((i) => i.payload.insights)
        .slice(0, 10)
        .join('; '),
      migrationPriorities: allRecs.slice(0, 6),
      securityRisks: allRisks.filter((r) => /security|vuln|cve/i.test(r)),
      scalabilityConcerns: insights
        .filter((i) => i.agentType === 'architecture-review')
        .flatMap((i) => i.payload.insights)
        .slice(0, 5),
      maintainabilityAssessment:
        insights.find((i) => i.agentType === 'architecture-review')?.payload.summary ??
        'Maintainability reviewed by AI agents.',
      agentSummaries,
      generatedAt: new Date().toISOString(),
      provider: provider as ModernizationReportContent['provider'],
      model,
    };
  }
}
