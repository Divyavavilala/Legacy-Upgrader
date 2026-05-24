import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModernizationReportStatus } from '@prisma/client';
import type { EnvConfig } from '../../config/env.validation';
import { PrismaService } from '../../prisma';
import { QueueService } from '../../queue/queue.service';

@Injectable()
export class AiOrchestrationService {
  private readonly logger = new Logger(AiOrchestrationService.name);
  private readonly aiEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    config: ConfigService<EnvConfig, true>,
  ) {
    this.aiEnabled = config.get('AI_ENABLED', { infer: true });
  }

  async scheduleAfterScan(params: {
    scanId: string;
    repositoryId: string;
    organizationId: string;
    requestedByUserId?: string;
  }): Promise<void> {
    if (!this.aiEnabled) {
      this.logger.debug('AI disabled; skipping post-scan orchestration');
      return;
    }

    const report = await this.prisma.modernizationReport.upsert({
      where: { scanId: params.scanId },
      create: {
        scanId: params.scanId,
        status: ModernizationReportStatus.DRAFT,
        title: 'AI Modernization Report',
      },
      update: { status: ModernizationReportStatus.DRAFT },
    });

    const basePayload = {
      scanId: params.scanId,
      repositoryId: params.repositoryId,
      organizationId: params.organizationId,
      requestedByUserId: params.requestedByUserId,
      reportId: report.id,
    };

    await this.queueService.enqueueAiModernization(basePayload);
    this.logger.log(`Queued AI modernization for scan ${params.scanId}`);

    await this.queueService.enqueueAiSecurityReview(basePayload);
    await this.queueService.enqueueAiArchitectureAnalysis(basePayload);
  }
}
