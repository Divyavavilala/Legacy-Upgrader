import { Processor } from '@nestjs/bullmq';
import {
  QUEUE_NAMES,
  QUEUE_WORKER_CONCURRENCY,
  type DependencyAnalysisJobPayload,
} from '@legacyupgrader/queue-constants';
import type { Job } from 'bullmq';
import { BaseWorker } from './base/base.worker';

@Processor(QUEUE_NAMES.DEPENDENCY_ANALYSIS, {
  concurrency: QUEUE_WORKER_CONCURRENCY[QUEUE_NAMES.DEPENDENCY_ANALYSIS].concurrency,
})
export class DependencyAnalysisWorker extends BaseWorker<DependencyAnalysisJobPayload> {
  protected async handle(job: Job<DependencyAnalysisJobPayload>): Promise<void> {
    this.logger.debug(
      `Dependency analysis placeholder — scanId=${job.data.scanId} repoId=${job.data.repositoryId}`,
    );
  }
}
