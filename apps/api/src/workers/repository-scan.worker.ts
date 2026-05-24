import { Processor } from '@nestjs/bullmq';
import {
  QUEUE_NAMES,
  QUEUE_WORKER_CONCURRENCY,
  type RepositoryScanJobPayload,
} from '@legacyupgrader/queue-constants';
import type { Job } from 'bullmq';
import { ScanProcessorService } from '../scans';
import { BaseWorker } from './base/base.worker';

@Processor(QUEUE_NAMES.REPOSITORY_SCAN, {
  concurrency: QUEUE_WORKER_CONCURRENCY[QUEUE_NAMES.REPOSITORY_SCAN].concurrency,
})
export class RepositoryScanWorker extends BaseWorker<RepositoryScanJobPayload> {
  constructor(private readonly scanProcessor: ScanProcessorService) {
    super();
  }

  protected async handle(job: Job<RepositoryScanJobPayload>): Promise<void> {
    await this.scanProcessor.processRepositoryScan(job.data);
  }
}
