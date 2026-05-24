import { Logger } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

export abstract class BaseWorker<TData> extends WorkerHost implements OnApplicationShutdown {
  protected readonly logger = new Logger(this.constructor.name);

  async process(job: Job<TData>): Promise<void> {
    const attempt = job.attemptsMade + 1;
    const maxAttempts = job.opts.attempts ?? 1;
    const started = Date.now();

    this.logger.log(
      `Job ${job.id} started [${job.name}] attempt ${attempt}/${maxAttempts}`,
    );

    try {
      await this.handle(job);
      this.logger.log(`Job ${job.id} completed in ${Date.now() - started}ms`);
    } catch (error) {
      this.logger.error(
        `Job ${job.id} failed on attempt ${attempt}/${maxAttempts}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  protected abstract handle(job: Job<TData>): Promise<void>;

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Closing worker (signal: ${signal ?? 'unknown'})…`);
    if (this.worker) {
      await this.worker.close();
    }
  }
}
