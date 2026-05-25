import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, QueuedJobStatus, ScanStatus } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { NotificationsService } from '../../notifications/notifications.service';
import type { ScanStage } from '../../scans/constants/scan-stages';
import {
  SCAN_COMPLETED_PROGRESS,
  SCAN_STAGE_PROGRESS,
} from '../../scans/constants/scan-stages';
import { PrismaService } from '../../prisma';
import { ScanCancelledError } from '../types/scan-analysis.types';

@Injectable()
export class ScanProgressService {
  private readonly logger = new Logger(ScanProgressService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async markRunning(scanId: string, stage: ScanStage = 'initializing'): Promise<void> {
    const startedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.scan.update({
        where: { id: scanId },
        data: {
          status: ScanStatus.RUNNING,
          startedAt,
          progress: SCAN_STAGE_PROGRESS[stage],
          currentStage: stage,
          metadata: { stages: [stage], engine: 'legacy-analyzer-v1' },
        },
      }),
      this.prisma.queuedJob.updateMany({
        where: { scanId, status: QueuedJobStatus.PENDING },
        data: { status: QueuedJobStatus.PROCESSING, startedAt },
      }),
    ]);
  }

  async updateStage(scanId: string, stage: ScanStage, extraMetadata?: Record<string, unknown>): Promise<void> {
    await this.assertNotCancelled(scanId);

    const existing = await this.prisma.scan.findUnique({
      where: { id: scanId },
      select: { metadata: true },
    });

    const prior =
      existing?.metadata && typeof existing.metadata === 'object'
        ? (existing.metadata as Record<string, unknown>)
        : {};

    const stages = Array.isArray(prior.stages) ? [...(prior.stages as string[]), stage] : [stage];

    await this.prisma.scan.update({
      where: { id: scanId },
      data: {
        progress: SCAN_STAGE_PROGRESS[stage],
        currentStage: stage,
        metadata: {
          ...prior,
          ...extraMetadata,
          stages,
          lastUpdatedAt: new Date().toISOString(),
          engine: 'legacy-analyzer-v1',
        },
      },
    });

    this.logger.log(`Scan ${scanId} → ${stage} (${SCAN_STAGE_PROGRESS[stage]}%)`);
  }

  async markCompleted(
    scanId: string,
    repositoryId: string,
    summary: Record<string, unknown>,
  ): Promise<void> {
    const completedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.scan.update({
        where: { id: scanId },
        data: {
          status: ScanStatus.COMPLETED,
          progress: SCAN_COMPLETED_PROGRESS,
          currentStage: 'completed',
          completedAt,
          metadata: {
            ...summary,
            completedAt: completedAt.toISOString(),
            engine: 'legacy-analyzer-v1',
          },
        },
      }),
      this.prisma.repository.update({
        where: { id: repositoryId },
        data: { lastSyncedAt: completedAt },
      }),
      this.prisma.queuedJob.updateMany({
        where: {
          scanId,
          status: { in: [QueuedJobStatus.PENDING, QueuedJobStatus.PROCESSING] },
        },
        data: { status: QueuedJobStatus.COMPLETED, completedAt },
      }),
    ]);

    const scan = await this.prisma.scan.findUnique({
      where: { id: scanId },
      select: {
        triggeredBy: true,
        repository: { select: { name: true, organizationId: true } },
      },
    });

    if (scan?.repository) {
      await this.auditService.log({
        organizationId: scan.repository.organizationId,
        userId: scan.triggeredBy ?? undefined,
        action: AuditAction.SCAN_COMPLETED,
        resourceType: 'scan',
        resourceId: scanId,
      });

      await this.notificationsService.notifyScanCompleted(
        scan.repository.organizationId,
        scanId,
        scan.repository.name,
        scan.triggeredBy ?? undefined,
      );
    }
  }

  async markFailed(scanId: string, error: unknown, partialMetadata?: Record<string, unknown>): Promise<void> {
    const message = error instanceof Error ? error.message : 'Unknown scan failure';
    const existing = await this.prisma.scan.findUnique({
      where: { id: scanId },
      select: { currentStage: true, metadata: true },
    });
    const prior =
      existing?.metadata && typeof existing.metadata === 'object'
        ? (existing.metadata as Record<string, unknown>)
        : {};
    const failedStage = existing?.currentStage ?? 'unknown';
    const friendlyMessage = this.toFriendlyError(message, failedStage);

    await this.prisma.scan.update({
      where: { id: scanId },
      data: {
        status: ScanStatus.FAILED,
        errorMessage: friendlyMessage,
        completedAt: new Date(),
        metadata: {
          ...prior,
          failed: true,
          error: message,
          friendlyError: friendlyMessage,
          failedStage,
          failureLogs: [
            ...(Array.isArray(prior.failureLogs) ? (prior.failureLogs as string[]) : []),
            `[${failedStage}] ${message}`,
          ],
          engine: 'legacy-analyzer-v1',
          ...partialMetadata,
        },
      },
    });

    await this.prisma.queuedJob.updateMany({
      where: {
        scanId,
        status: { in: [QueuedJobStatus.PENDING, QueuedJobStatus.PROCESSING] },
      },
      data: {
        status: QueuedJobStatus.FAILED,
        errorMessage: message,
        completedAt: new Date(),
      },
    });

    const scan = await this.prisma.scan.findUnique({
      where: { id: scanId },
      select: {
        triggeredBy: true,
        repository: { select: { name: true, organizationId: true } },
      },
    });

    if (scan?.repository) {
      await this.auditService.log({
        organizationId: scan.repository.organizationId,
        userId: scan.triggeredBy ?? undefined,
        action: AuditAction.SCAN_FAILED,
        resourceType: 'scan',
        resourceId: scanId,
        metadata: { error: message },
      });

      await this.notificationsService.notifyScanFailed(
        scan.repository.organizationId,
        scanId,
        scan.repository.name,
        friendlyMessage,
        scan.triggeredBy ?? undefined,
      );
    }
  }

  private toFriendlyError(message: string, stage: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('branch') && lower.includes('not found')) {
      return `Failed: branch not found — check the default branch for this repository`;
    }
    if (lower.includes('timeout') || lower.includes('timed out')) {
      return `Failed: git clone timeout — repository may be too large or network is slow`;
    }
    if (lower.includes('authentication') || lower.includes('permission denied')) {
      return `Failed: cannot access repository — verify URL is public or credentials are configured`;
    }
    if (lower.includes('not found') && lower.includes('repository')) {
      return `Failed: repository not found — verify the Git URL is correct`;
    }
    if (stage === 'cloning') {
      return `Failed during clone: ${message}`;
    }
    if (lower.includes('unsupported')) {
      return `Failed: unsupported repository structure`;
    }
    return `Failed at ${stage.replace(/-/g, ' ')}: ${message}`;
  }

  async assertNotCancelled(scanId: string): Promise<void> {
    const scan = await this.prisma.scan.findUnique({
      where: { id: scanId },
      select: { status: true },
    });

    if (scan?.status === ScanStatus.CANCELLED) {
      throw new ScanCancelledError();
    }
  }
}
