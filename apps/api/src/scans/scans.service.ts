import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { QueuedJobStatus, QueuedJobType, ScanStatus } from '@prisma/client';
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
  ) {}

  async triggerScan(repositoryId: string, user: AuthenticatedUser) {
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
