import { Processor } from '@nestjs/bullmq';
import {
  QUEUE_NAMES,
  QUEUE_WORKER_CONCURRENCY,
  type ReportGenerationJobPayload,
} from '@legacyupgrader/queue-constants';
import type { Job } from 'bullmq';
import { BaseWorker } from './base/base.worker';

@Processor(QUEUE_NAMES.REPORT_GENERATION, {
  concurrency: QUEUE_WORKER_CONCURRENCY[QUEUE_NAMES.REPORT_GENERATION].concurrency,
})
export class ReportGenerationWorker extends BaseWorker<ReportGenerationJobPayload> {
  protected async handle(job: Job<ReportGenerationJobPayload>): Promise<void> {
    this.logger.debug(
      `Report generation placeholder — reportId=${job.data.reportId} scanId=${job.data.scanId}`,
    );
  }
}
