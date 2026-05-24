import { Injectable } from '@nestjs/common';
import { QueuedJobStatus, ScanStatus } from '@prisma/client';
import { PrismaService } from '../prisma';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async getPlatformHealth() {
    const since24h = new Date(Date.now() - 86_400_000);

    const [
      organizations,
      users,
      repositories,
      scans24h,
      completedScans24h,
      failedScans24h,
      activeScans,
      queuedJobs,
      aiTokens24h,
      queueHealth,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.repository.count({ where: { isActive: true } }),
      this.prisma.scan.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.scan.count({
        where: { createdAt: { gte: since24h }, status: ScanStatus.COMPLETED },
      }),
      this.prisma.scan.count({
        where: { createdAt: { gte: since24h }, status: ScanStatus.FAILED },
      }),
      this.prisma.scan.count({
        where: { status: { in: [ScanStatus.QUEUED, ScanStatus.RUNNING] } },
      }),
      this.prisma.queuedJob.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.aiTokenUsage.aggregate({
        where: { createdAt: { gte: since24h } },
        _sum: { totalTokens: true },
      }),
      this.queueService.getDashboardHealth(),
    ]);

    const jobCounts = Object.fromEntries(
      queuedJobs.map((j) => [j.status, j._count.id]),
    ) as Record<string, number>;

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      platform: {
        organizations,
        users,
        repositories,
      },
      scans: {
        last24h: scans24h,
        completed24h: completedScans24h,
        failed24h: failedScans24h,
        active: activeScans,
        throughputPerHour: scans24h > 0 ? Math.round(scans24h / 24) : 0,
      },
      workers: {
        queuedJobs: jobCounts,
        pending: jobCounts[QueuedJobStatus.PENDING] ?? 0,
        processing: jobCounts[QueuedJobStatus.PROCESSING] ?? 0,
        failed: jobCounts[QueuedJobStatus.FAILED] ?? 0,
        deadLetter: jobCounts[QueuedJobStatus.DEAD_LETTER] ?? 0,
      },
      ai: {
        tokensLast24h: aiTokens24h._sum.totalTokens ?? 0,
      },
      queues: queueHealth,
    };
  }
}
