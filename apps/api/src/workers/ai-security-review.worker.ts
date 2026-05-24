import { Processor } from '@nestjs/bullmq';
import {
  QUEUE_NAMES,
  QUEUE_WORKER_CONCURRENCY,
  type AiSecurityReviewJobPayload,
} from '@legacyupgrader/queue-constants';
import type { Job } from 'bullmq';
import { AiModernizationPipeline } from '../ai/pipeline/ai-modernization.pipeline';
import { BaseWorker } from './base/base.worker';

@Processor(QUEUE_NAMES.AI_SECURITY_REVIEW, {
  concurrency: QUEUE_WORKER_CONCURRENCY[QUEUE_NAMES.AI_SECURITY_REVIEW].concurrency,
})
export class AiSecurityReviewWorker extends BaseWorker<AiSecurityReviewJobPayload> {
  constructor(private readonly pipeline: AiModernizationPipeline) {
    super();
  }

  protected async handle(job: Job<AiSecurityReviewJobPayload>): Promise<void> {
    await this.pipeline.runSecurityReview(job.data);
  }
}
