import { Processor } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import {
  QUEUE_NAMES,
  QUEUE_WORKER_CONCURRENCY,
  type AiArchitectureAnalysisJobPayload,
} from '@legacyupgrader/queue-constants';
import type { Job } from 'bullmq';
import { AiModernizationPipeline } from '../ai/pipeline/ai-modernization.pipeline';
import type { EnvConfig } from '../config/env.validation';
import { BaseWorker } from './base/base.worker';
import { withJobTimeout } from './base/ai-job-timeout.util';

@Processor(QUEUE_NAMES.AI_ARCHITECTURE_ANALYSIS, {
  concurrency:
    QUEUE_WORKER_CONCURRENCY[QUEUE_NAMES.AI_ARCHITECTURE_ANALYSIS].concurrency,
})
export class AiArchitectureAnalysisWorker extends BaseWorker<AiArchitectureAnalysisJobPayload> {
  private readonly jobTimeoutMs: number;

  constructor(
    private readonly pipeline: AiModernizationPipeline,
    config: ConfigService<EnvConfig, true>,
  ) {
    super();
    this.jobTimeoutMs = config.get('AI_JOB_TIMEOUT_MS', { infer: true });
  }

  protected async handle(job: Job<AiArchitectureAnalysisJobPayload>): Promise<void> {
    await withJobTimeout(this.pipeline.runArchitectureAnalysis(job.data), this.jobTimeoutMs);
  }
}
