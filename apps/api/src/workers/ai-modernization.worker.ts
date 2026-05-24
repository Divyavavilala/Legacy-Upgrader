import { Processor } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import {
  QUEUE_NAMES,
  QUEUE_WORKER_CONCURRENCY,
  type AiModernizationJobPayload,
} from '@legacyupgrader/queue-constants';
import type { Job } from 'bullmq';
import { AiModernizationPipeline } from '../ai/pipeline/ai-modernization.pipeline';
import type { EnvConfig } from '../config/env.validation';
import { BaseWorker } from './base/base.worker';
import { withJobTimeout } from './base/ai-job-timeout.util';

@Processor(QUEUE_NAMES.AI_MODERNIZATION, {
  concurrency: QUEUE_WORKER_CONCURRENCY[QUEUE_NAMES.AI_MODERNIZATION].concurrency,
})
export class AiModernizationWorker extends BaseWorker<AiModernizationJobPayload> {
  private readonly jobTimeoutMs: number;

  constructor(
    private readonly pipeline: AiModernizationPipeline,
    config: ConfigService<EnvConfig, true>,
  ) {
    super();
    this.jobTimeoutMs = config.get('AI_JOB_TIMEOUT_MS', { infer: true });
  }

  protected async handle(job: Job<AiModernizationJobPayload>): Promise<void> {
    this.logger.log(`AI modernization started for scan ${job.data.scanId}`);
    const started = Date.now();
    await withJobTimeout(this.pipeline.runFullModernization(job.data), this.jobTimeoutMs);
    this.logger.log(
      `AI modernization finished for scan ${job.data.scanId} in ${Date.now() - started}ms`,
    );
  }
}
