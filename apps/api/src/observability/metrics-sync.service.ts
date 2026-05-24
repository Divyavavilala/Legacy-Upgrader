import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../config/env.validation';
import { QueueService } from '../queue/queue.service';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsSyncService.name);
  private timer?: NodeJS.Timeout;
  private readonly enabled: boolean;

  constructor(
    private readonly metricsService: MetricsService,
    private readonly queueService: QueueService,
    config: ConfigService<EnvConfig, true>,
  ) {
    this.enabled = config.get('METRICS_ENABLED', { infer: true });
  }

  onModuleInit(): void {
    if (!this.enabled) {
      return;
    }
    void this.syncQueueMetrics();
    this.timer = setInterval(() => void this.syncQueueMetrics(), 15_000);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async syncQueueMetrics(): Promise<void> {
    try {
      const health = await this.queueService.getDashboardHealth();
      for (const queue of health.queues) {
        this.metricsService.setQueueDepth(queue.name, 'waiting', queue.counts.waiting);
        this.metricsService.setQueueDepth(queue.name, 'active', queue.counts.active);
        this.metricsService.setQueueDepth(queue.name, 'failed', queue.counts.failed);
        this.metricsService.setQueueDepth(queue.name, 'delayed', queue.counts.delayed);
      }
    } catch (error) {
      this.logger.debug(
        `Queue metrics sync skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
