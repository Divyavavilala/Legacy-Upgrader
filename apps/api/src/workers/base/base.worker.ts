import { Inject, Logger, Optional } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { WorkerHost } from '@nestjs/bullmq';
import { QueuedJobStatus } from '@prisma/client';
import type { Job } from 'bullmq';
import { MetricsService } from '../../observability/metrics.service';
import { PrismaService } from '../../prisma';

export abstract class BaseWorker<TData> extends WorkerHost implements OnApplicationShutdown {
  protected readonly logger = new Logger(this.constructor.name);

  @Optional()
  @Inject(MetricsService)
  protected readonly metrics?: MetricsService;

  @Optional()
  @Inject(PrismaService)
  protected readonly prisma?: PrismaService;

  async process(job: Job<TData>): Promise<void> {
    const attempt = job.attemptsMade + 1;
    const maxAttempts = job.opts.attempts ?? 1;
    const started = Date.now();
    const queueName = job.queueName;

    this.logger.log(
      `Job ${job.id} started [${job.name}] attempt ${attempt}/${maxAttempts}`,
    );

    try {
      await this.handle(job);
      const durationMs = Date.now() - started;
      this.logger.log(`Job ${job.id} completed in ${durationMs}ms`);
      this.metrics?.recordWorkerJob(queueName, 'completed', durationMs);

      if (queueName === 'repository-scan') {
        this.metrics?.recordScan('completed', durationMs);
      }
    } catch (error) {
      const durationMs = Date.now() - started;
      this.logger.error(
        `Job ${job.id} failed on attempt ${attempt}/${maxAttempts}`,
        error instanceof Error ? error.stack : String(error),
      );
      this.metrics?.recordWorkerJob(queueName, 'failed', durationMs);

      if (attempt >= maxAttempts) {
        await this.handleDeadLetter(job, error);
      }

      throw error;
    }
  }

  protected abstract handle(job: Job<TData>): Promise<void>;

  private async handleDeadLetter(job: Job<TData>, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`Job ${job.id} moved to dead-letter after ${job.attemptsMade + 1} attempts`);

    if (!this.prisma) {
      return;
    }

    const payload = job.data as Record<string, unknown>;
    const organizationId =
      typeof payload.organizationId === 'string' ? payload.organizationId : undefined;
    const scanId = typeof payload.scanId === 'string' ? payload.scanId : undefined;

    if (!organizationId) {
      return;
    }

    await this.prisma.queuedJob.updateMany({
      where: {
        organizationId,
        ...(scanId ? { scanId } : {}),
        status: { in: [QueuedJobStatus.PENDING, QueuedJobStatus.PROCESSING] },
      },
      data: {
        status: QueuedJobStatus.DEAD_LETTER,
        errorMessage: message,
        completedAt: new Date(),
      },
    });
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Closing worker (signal: ${signal ?? 'unknown'})…`);
    if (this.worker) {
      await this.worker.close();
    }
  }
}
