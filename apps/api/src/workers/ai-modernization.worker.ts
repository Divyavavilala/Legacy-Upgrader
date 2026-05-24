import { Processor } from '@nestjs/bullmq';
import {
  QUEUE_NAMES,
  QUEUE_WORKER_CONCURRENCY,
  type AiModernizationJobPayload,
} from '@legacyupgrader/queue-constants';
import type { Job } from 'bullmq';
import { BaseWorker } from './base/base.worker';

@Processor(QUEUE_NAMES.AI_MODERNIZATION, {
  concurrency: QUEUE_WORKER_CONCURRENCY[QUEUE_NAMES.AI_MODERNIZATION].concurrency,
})
export class AiModernizationWorker extends BaseWorker<AiModernizationJobPayload> {
  protected async handle(job: Job<AiModernizationJobPayload>): Promise<void> {
    this.logger.debug(
      `AI modernization placeholder — scanId=${job.data.scanId} repoId=${job.data.repositoryId}`,
    );
  }
}
