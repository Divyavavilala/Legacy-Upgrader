import { Injectable, Logger } from '@nestjs/common';
import { QueuedJobStatus, ScanStatus } from '@prisma/client';
import type { RepositoryScanJobPayload } from '@legacyupgrader/queue-constants';
import { PrismaService } from '../prisma';
import { MOCK_FINDING_TEMPLATES } from './data/mock-findings';
import {
  SCAN_STAGE_DELAY_MS,
  SCAN_STAGE_PROGRESS,
  SCAN_STAGES,
  type ScanStage,
} from './constants/scan-stages';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

@Injectable()
export class ScanProcessorService {
  private readonly logger = new Logger(ScanProcessorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processRepositoryScan(payload: RepositoryScanJobPayload): Promise<void> {
    const { scanId, repositoryId, organizationId } = payload;

    await this.markRunning(scanId);

    try {
      for (const stage of SCAN_STAGES) {
        await this.runStage(scanId, repositoryId, organizationId, stage);
        await delay(SCAN_STAGE_DELAY_MS);
      }

      await this.createMockFindings(scanId);
      await this.markCompleted(scanId, repositoryId);
    } catch (error) {
      await this.markFailed(scanId, error);
      throw error;
    }
  }

  private async markRunning(scanId: string): Promise<void> {
    const startedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.scan.update({
        where: { id: scanId },
        data: {
          status: ScanStatus.RUNNING,
          startedAt,
          progress: 0,
          currentStage: SCAN_STAGES[0],
          metadata: { stages: [] },
        },
      }),
      this.prisma.queuedJob.updateMany({
        where: { scanId, status: QueuedJobStatus.PENDING },
        data: {
          status: QueuedJobStatus.PROCESSING,
          startedAt,
        },
      }),
    ]);
  }

  private async runStage(
    scanId: string,
    repositoryId: string,
    organizationId: string,
    stage: ScanStage,
  ): Promise<void> {
    this.logger.log(
      `Scan ${scanId} — stage "${stage}" (repo=${repositoryId}, org=${organizationId})`,
    );

    const progress = SCAN_STAGE_PROGRESS[stage];
    const existing = await this.prisma.scan.findUnique({
      where: { id: scanId },
      select: { metadata: true },
    });

    const priorMetadata =
      existing?.metadata && typeof existing.metadata === 'object'
        ? (existing.metadata as Record<string, unknown>)
        : {};
    const stages = Array.isArray(priorMetadata.stages)
      ? [...(priorMetadata.stages as string[]), stage]
      : [stage];

    await this.prisma.scan.update({
      where: { id: scanId },
      data: {
        progress,
        currentStage: stage,
        metadata: {
          ...priorMetadata,
          stages,
          lastUpdatedAt: new Date().toISOString(),
          simulated: true,
        },
      },
    });
  }

  private async createMockFindings(scanId: string): Promise<void> {
    await this.prisma.finding.createMany({
      data: MOCK_FINDING_TEMPLATES.map((template) => ({
        scanId,
        severity: template.severity,
        category: template.category,
        title: template.title,
        description: template.description,
        filePath: template.filePath,
        lineStart: template.lineStart,
        ruleId: template.ruleId,
        fingerprint: `${scanId}:${template.fingerprint}`,
        metadata: { source: 'mock-analyzer', version: '1.0.0' },
      })),
    });
  }

  private async markCompleted(scanId: string, repositoryId: string): Promise<void> {
    const completedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.scan.update({
        where: { id: scanId },
        data: {
          status: ScanStatus.COMPLETED,
          progress: 100,
          currentStage: null,
          completedAt,
          metadata: {
            simulated: true,
            findingsCount: MOCK_FINDING_TEMPLATES.length,
            completedAt: completedAt.toISOString(),
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
        data: {
          status: QueuedJobStatus.COMPLETED,
          completedAt,
        },
      }),
    ]);

    this.logger.log(`Scan ${scanId} completed with ${MOCK_FINDING_TEMPLATES.length} findings`);
  }

  private async markFailed(scanId: string, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : 'Unknown scan failure';

    await this.prisma.scan.update({
      where: { id: scanId },
      data: {
        status: ScanStatus.FAILED,
        errorMessage: message,
        completedAt: new Date(),
        metadata: { failed: true, error: message },
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
  }
}
