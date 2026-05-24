import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, QueuedJobStatus, QueuedJobType, ScanStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { QuotasService } from '../platform/quotas.service';
import { UsageService } from '../platform/usage.service';
import { PrismaService } from '../prisma';
import { QueueService } from '../queue/queue.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';
import type { ScanProgressResponse } from './interfaces/scan-progress.interface';

@Injectable()
export class ScansService {
  private readonly logger = new Logger(ScansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly quotasService: QuotasService,
    private readonly usageService: UsageService,
    private readonly auditService: AuditService,
  ) {}

  async triggerScan(repositoryId: string, user: AuthenticatedUser) {
    await this.quotasService.assertWithinQuota(user.organizationId, 'scans');

    const repository = await this.assertRepositoryInOrg(repositoryId, user.organizationId);

    const scan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.scan.create({
        data: {
          repositoryId: repository.id,
          status: ScanStatus.PENDING,
          branch: repository.defaultBranch ?? 'main',
          triggeredBy: user.id,
          progress: 0,
          metadata: { enqueuedAt: new Date().toISOString() },
        },
      });

      await tx.queuedJob.create({
        data: {
          organizationId: user.organizationId,
          scanId: created.id,
          createdById: user.id,
          type: QueuedJobType.SCAN_REPOSITORY,
          status: QueuedJobStatus.PENDING,
          payload: {
            scanId: created.id,
            repositoryId: repository.id,
            organizationId: user.organizationId,
          },
        },
      });

      return created;
    });

    const jobId = await this.queueService.enqueueRepositoryScan({
      scanId: scan.id,
      repositoryId: repository.id,
      organizationId: user.organizationId,
      requestedByUserId: user.id,
      branch: scan.branch ?? undefined,
    });

    await this.prisma.scan.update({
      where: { id: scan.id },
      data: {
        status: ScanStatus.QUEUED,
        metadata: {
          ...(typeof scan.metadata === 'object' && scan.metadata !== null
            ? scan.metadata
            : {}),
          bullmqJobId: jobId,
        },
      },
    });

    await this.usageService.incrementScans(user.organizationId);
    await this.usageService.incrementWorkerJobs(user.organizationId);
    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.authType === 'api_key' ? undefined : user.id,
      apiKeyId: user.apiKeyId,
      action: AuditAction.SCAN_TRIGGERED,
      resourceType: 'scan',
      resourceId: scan.id,
      metadata: { repositoryId, jobId },
    });

    this.logger.log(`Scan ${scan.id} queued for repository ${repositoryId} (job ${jobId})`);

    return this.findByIdForOrg(scan.id, user.organizationId);
  }

  async listByRepository(repositoryId: string, organizationId: string) {
    await this.assertRepositoryInOrg(repositoryId, organizationId);

    return this.prisma.scan.findMany({
      where: { repositoryId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { findings: true } },
      },
    });
  }

  async findByIdForOrg(scanId: string, organizationId: string) {
    const scan = await this.prisma.scan.findFirst({
      where: {
        id: scanId,
        repository: { organizationId, isActive: true },
      },
      include: {
        findings: { orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }] },
        repository: {
          select: { id: true, name: true, slug: true, organizationId: true },
        },
        _count: { select: { findings: true, dependencyIssues: true } },
      },
    });

    if (!scan) {
      throw new NotFoundException('Scan not found');
    }

    return scan;
  }

  async getAiReport(scanId: string, organizationId: string) {
    await this.findByIdForOrg(scanId, organizationId);

    const report = await this.prisma.modernizationReport.findUnique({
      where: { scanId },
    });

    if (!report) {
      throw new NotFoundException('AI modernization report not found for this scan');
    }

    const insights = await this.prisma.aiInsight.findMany({
      where: { scanId },
      orderBy: { createdAt: 'asc' },
    });

    const tokenUsage = await this.prisma.aiTokenUsage.findMany({
      where: { scanId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { report, insights, tokenUsage };
  }

  async getProgress(scanId: string, organizationId: string): Promise<ScanProgressResponse> {
    const scan = await this.prisma.scan.findFirst({
      where: {
        id: scanId,
        repository: { organizationId },
      },
      select: {
        status: true,
        progress: true,
        currentStage: true,
        startedAt: true,
        completedAt: true,
      },
    });

    if (!scan) {
      throw new NotFoundException('Scan not found');
    }

    return {
      status: scan.status,
      progress: scan.progress,
      currentStage: scan.currentStage,
      startedAt: scan.startedAt,
      completedAt: scan.completedAt,
    };
  }

  private async assertRepositoryInOrg(repositoryId: string, organizationId: string) {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, organizationId, isActive: true },
    });

    if (!repository) {
      throw new NotFoundException('Repository not found');
    }

    const activeScan = await this.prisma.scan.findFirst({
      where: {
        repositoryId,
        status: { in: [ScanStatus.PENDING, ScanStatus.QUEUED, ScanStatus.RUNNING] },
      },
    });

    if (activeScan) {
      throw new BadRequestException(
        'A scan is already in progress for this repository. Wait for it to complete before starting another.',
      );
    }

    return repository;
  }
}
