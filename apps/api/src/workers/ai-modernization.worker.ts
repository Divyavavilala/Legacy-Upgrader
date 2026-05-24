import { Processor } from '@nestjs/bullmq';
import {
  QUEUE_NAMES,
  QUEUE_WORKER_CONCURRENCY,
  type AiModernizationJobPayload,
} from '@legacyupgrader/queue-constants';
import type { Job } from 'bullmq';
import { AiModernizationPipeline } from '../ai/pipeline/ai-modernization.pipeline';
import { BaseWorker } from './base/base.worker';

@Processor(QUEUE_NAMES.AI_MODERNIZATION, {
  concurrency: QUEUE_WORKER_CONCURRENCY[QUEUE_NAMES.AI_MODERNIZATION].concurrency,
})
export class AiModernizationWorker extends BaseWorker<AiModernizationJobPayload> {
  constructor(private readonly pipeline: AiModernizationPipeline) {
    super();
  }

  protected async handle(job: Job<AiModernizationJobPayload>): Promise<void> {
    this.logger.log(`AI modernization started for scan ${job.data.scanId}`);
    await this.pipeline.runFullModernization(job.data);
  }
}
