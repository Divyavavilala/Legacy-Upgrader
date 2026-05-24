import { ModernizationReportStatus } from '@prisma/client';
import { AiModernizationPipeline } from './ai-modernization.pipeline';
import type { BaseAiAgent } from '../agents/base-ai.agent';

describe('AiModernizationPipeline', () => {
  it('persists insights and publishes modernization report', async () => {
    const report = {
      id: 'report-1',
      scanId: 'scan-1',
      status: ModernizationReportStatus.DRAFT,
    };

    const prisma = {
      modernizationReport: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(report),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({
          ...report,
          status: ModernizationReportStatus.PUBLISHED,
        }),
      },
      aiInsight: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'insight-1' }),
        update: jest.fn(),
      },
      migrationRecommendation: { create: jest.fn() },
      scan: {
        findUnique: jest.fn().mockResolvedValue({ metadata: {} }),
        update: jest.fn(),
      },
    };

    const agentPayload = {
      title: 'Architecture insight',
      summary: 'Modernize modules',
      insights: ['Split monolith'],
      recommendations: [
        {
          title: 'Extract auth service',
          description: 'Isolate authentication',
          priority: 'HIGH' as const,
          effort: 'MEDIUM' as const,
        },
      ],
      risks: ['Scaling bottleneck'],
      confidence: 0.82,
    };

    const agent = {
      agentType: 'architecture-review',
      run: jest.fn().mockResolvedValue(agentPayload),
    } as unknown as BaseAiAgent;

    const pipeline = new AiModernizationPipeline(
      prisma as never,
      { buildSnapshot: jest.fn().mockResolvedValue({ repositoryName: 'demo', repositorySlug: 'demo' }) } as never,
      { resolvePrimaryProvider: () => ({ name: 'heuristic' }) } as never,
      { notifyAiReportCompleted: jest.fn() } as never,
      { log: jest.fn() } as never,
      agent as never,
      agent as never,
      agent as never,
      agent as never,
      agent as never,
      agent as never,
    );

    (pipeline as unknown as { allAgents: BaseAiAgent[] }).allAgents = [agent];

    const reportId = await pipeline.runArchitectureAnalysis({
      scanId: 'scan-1',
      repositoryId: 'repo-1',
      organizationId: 'org-1',
      reportId: 'report-1',
    });

    expect(reportId).toBe('report-1');
    expect(prisma.aiInsight.create).toHaveBeenCalled();
    expect(prisma.modernizationReport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'report-1' },
        data: expect.objectContaining({ status: ModernizationReportStatus.GENERATING }),
      }),
    );
  });
});
