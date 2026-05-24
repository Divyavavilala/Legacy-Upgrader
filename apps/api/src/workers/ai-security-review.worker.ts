import { Processor } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import {
  QUEUE_NAMES,
  QUEUE_WORKER_CONCURRENCY,
  type AiSecurityReviewJobPayload,
} from '@legacyupgrader/queue-constants';
import type { Job } from 'bullmq';
import { AiModernizationPipeline } from '../ai/pipeline/ai-modernization.pipeline';
import type { EnvConfig } from '../config/env.validation';
import { BaseWorker } from './base/base.worker';
import { withJobTimeout } from './base/ai-job-timeout.util';

@Processor(QUEUE_NAMES.AI_SECURITY_REVIEW, {
  concurrency: QUEUE_WORKER_CONCURRENCY[QUEUE_NAMES.AI_SECURITY_REVIEW].concurrency,
})
export class AiSecurityReviewWorker extends BaseWorker<AiSecurityReviewJobPayload> {
  private readonly jobTimeoutMs: number;

  constructor(
    private readonly pipeline: AiModernizationPipeline,
    config: ConfigService<EnvConfig, true>,
  ) {
    super();
    this.jobTimeoutMs = config.get('AI_JOB_TIMEOUT_MS', { infer: true });
  }

  protected async handle(job: Job<AiSecurityReviewJobPayload>): Promise<void> {
    await withJobTimeout(this.pipeline.runSecurityReview(job.data), this.jobTimeoutMs);
  }
}
