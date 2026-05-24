import { Processor } from '@nestjs/bullmq';
import {
  QUEUE_NAMES,
  QUEUE_WORKER_CONCURRENCY,
  type AiArchitectureAnalysisJobPayload,
} from '@legacyupgrader/queue-constants';
import type { Job } from 'bullmq';
import { AiModernizationPipeline } from '../ai/pipeline/ai-modernization.pipeline';
import { BaseWorker } from './base/base.worker';

@Processor(QUEUE_NAMES.AI_ARCHITECTURE_ANALYSIS, {
  concurrency:
    QUEUE_WORKER_CONCURRENCY[QUEUE_NAMES.AI_ARCHITECTURE_ANALYSIS].concurrency,
})
export class AiArchitectureAnalysisWorker extends BaseWorker<AiArchitectureAnalysisJobPayload> {
  constructor(private readonly pipeline: AiModernizationPipeline) {
    super();
  }

  protected async handle(job: Job<AiArchitectureAnalysisJobPayload>): Promise<void> {
    await this.pipeline.runArchitectureAnalysis(job.data);
  }
}
