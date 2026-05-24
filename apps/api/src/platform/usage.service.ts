import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';

export interface UsageSnapshot {
  periodYear: number;
  periodMonth: number;
  scanCount: number;
  aiTokensUsed: number;
  repositoryCount: number;
  workerJobsCount: number;
  storageBytes: bigint;
}

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  private currentPeriod(): { year: number; month: number } {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  async getOrCreateMetric(organizationId: string) {
    const { year, month } = this.currentPeriod();

    return this.prisma.organizationUsageMetric.upsert({
      where: {
        organizationId_periodYear_periodMonth: {
          organizationId,
          periodYear: year,
          periodMonth: month,
        },
      },
      create: {
        organizationId,
        periodYear: year,
        periodMonth: month,
        repositoryCount: await this.prisma.repository.count({
          where: { organizationId, isActive: true },
        }),
      },
      update: {},
    });
  }

  async incrementScans(organizationId: string, count = 1): Promise<void> {
    const metric = await this.getOrCreateMetric(organizationId);
    await this.prisma.organizationUsageMetric.update({
      where: { id: metric.id },
      data: { scanCount: { increment: count } },
    });
  }

  async incrementAiTokens(organizationId: string, tokens: number): Promise<void> {
    const metric = await this.getOrCreateMetric(organizationId);
    await this.prisma.organizationUsageMetric.update({
      where: { id: metric.id },
      data: { aiTokensUsed: { increment: tokens } },
    });
  }

  async incrementWorkerJobs(organizationId: string, count = 1): Promise<void> {
    const metric = await this.getOrCreateMetric(organizationId);
    await this.prisma.organizationUsageMetric.update({
      where: { id: metric.id },
      data: { workerJobsCount: { increment: count } },
    });
  }

  async syncRepositoryCount(organizationId: string): Promise<void> {
    const count = await this.prisma.repository.count({
      where: { organizationId, isActive: true },
    });
    const metric = await this.getOrCreateMetric(organizationId);
    await this.prisma.organizationUsageMetric.update({
      where: { id: metric.id },
      data: { repositoryCount: count },
    });
  }

  async getCurrentUsage(organizationId: string) {
    const [metric, subscription, liveRepos, liveScansMonth, liveAiTokens] = await Promise.all([
      this.getOrCreateMetric(organizationId),
      this.prisma.organizationSubscription.findUnique({
        where: { organizationId },
        include: { plan: true },
      }),
      this.prisma.repository.count({ where: { organizationId, isActive: true } }),
      this.prisma.scan.count({
        where: {
          repository: { organizationId },
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      this.prisma.aiTokenUsage.aggregate({
        where: {
          organizationId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { totalTokens: true },
      }),
    ]);

    const workerJobs = await this.prisma.queuedJob.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    return {
      period: { year: metric.periodYear, month: metric.periodMonth },
      scans: Math.max(metric.scanCount, liveScansMonth),
      aiTokens: Math.max(metric.aiTokensUsed, liveAiTokens._sum.totalTokens ?? 0),
      repositories: Math.max(metric.repositoryCount, liveRepos),
      workerJobs: Math.max(metric.workerJobsCount, workerJobs),
      storageBytes: metric.storageBytes.toString(),
      plan: subscription?.plan ?? null,
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
          }
        : null,
    };
  }
}
