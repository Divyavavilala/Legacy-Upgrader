import { Processor } from '@nestjs/bullmq';
import {
  QUEUE_NAMES,
  QUEUE_WORKER_CONCURRENCY,
  type RepositoryScanJobPayload,
} from '@legacyupgrader/queue-constants';
import type { Job } from 'bullmq';
import { BaseWorker } from './base/base.worker';

@Processor(QUEUE_NAMES.REPOSITORY_SCAN, {
  concurrency: QUEUE_WORKER_CONCURRENCY[QUEUE_NAMES.REPOSITORY_SCAN].concurrency,
})
export class RepositoryScanWorker extends BaseWorker<RepositoryScanJobPayload> {
  protected async handle(job: Job<RepositoryScanJobPayload>): Promise<void> {
    this.logger.debug(
      `Repository scan placeholder — scanId=${job.data.scanId} repoId=${job.data.repositoryId}`,
    );
  }
}
