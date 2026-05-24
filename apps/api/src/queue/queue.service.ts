import { getQueueToken } from '@nestjs/bullmq';
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  ALL_QUEUE_NAMES,
  QUEUE_DEFAULT_JOB_OPTIONS,
  type AiModernizationJobPayload,
  type DependencyAnalysisJobPayload,
  type QueueJobPayloadMap,
  type QueueName,
  QUEUE_NAMES,
  type ReportGenerationJobPayload,
  type RepositoryScanJobPayload,
} from '@legacyupgrader/queue-constants';
import type { JobsOptions, Queue } from 'bullmq';
import Redis from 'ioredis';
import type { QueueDashboardHealth, SingleQueueHealth } from './interfaces/queue-health.interface';
import { REDIS_CLIENT } from './redis.module';

@Injectable()
export class QueueService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<QueueName, Queue>();

  constructor(
    private readonly moduleRef: ModuleRef,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  onModuleInit(): void {
    for (const name of ALL_QUEUE_NAMES) {
      const queue = this.moduleRef.get<Queue>(getQueueToken(name), { strict: false });
      this.queues.set(name, queue);
    }
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Closing queues (signal: ${signal ?? 'unknown'})…`);
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
    this.logger.log('All queues closed');
  }

  async enqueueRepositoryScan(
    payload: RepositoryScanJobPayload,
    options?: JobsOptions,
  ): Promise<string> {
    return this.enqueue(QUEUE_NAMES.REPOSITORY_SCAN, payload, options);
  }

  async enqueueDependencyAnalysis(
    payload: DependencyAnalysisJobPayload,
    options?: JobsOptions,
  ): Promise<string> {
    return this.enqueue(QUEUE_NAMES.DEPENDENCY_ANALYSIS, payload, options);
  }

  async enqueueAiModernization(
    payload: AiModernizationJobPayload,
    options?: JobsOptions,
  ): Promise<string> {
    return this.enqueue(QUEUE_NAMES.AI_MODERNIZATION, payload, options);
  }

  async enqueueReportGeneration(
    payload: ReportGenerationJobPayload,
    options?: JobsOptions,
  ): Promise<string> {
    return this.enqueue(QUEUE_NAMES.REPORT_GENERATION, payload, options);
  }

  async enqueue<T extends QueueName>(
    queueName: T,
    payload: QueueJobPayloadMap[T],
    options?: JobsOptions,
  ): Promise<string> {
    const queue = this.getQueue(queueName);
    const defaults = QUEUE_DEFAULT_JOB_OPTIONS[queueName];

    const job = await queue.add(queueName, payload, {
      attempts: defaults.attempts,
      backoff: defaults.backoff,
      removeOnComplete: defaults.removeOnComplete,
      removeOnFail: defaults.removeOnFail,
      ...options,
    });

    this.logger.debug(`Enqueued job ${job.id} on queue "${queueName}"`);
    return job.id!;
  }

  getQueue(name: QueueName): Queue {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue "${name}" is not registered`);
    }
    return queue;
  }

  async getDashboardHealth(): Promise<QueueDashboardHealth> {
    const checkedAt = new Date().toISOString();
    const redis = await this.checkRedis();

    const queues: SingleQueueHealth[] = await Promise.all(
      ALL_QUEUE_NAMES.map((name: QueueName) =>
  this.getQueueHealth(name),
),
    );

    const statuses = [redis.status, ...queues.map((q) => q.status)];
    const status = this.aggregateStatus(statuses);

    return { status, redis, queues, checkedAt };
  }

  private async getQueueHealth(name: QueueName): Promise<SingleQueueHealth> {
    try {
      const queue = this.getQueue(name);
      const [counts, isPaused] = await Promise.all([
        queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
        queue.isPaused(),
      ]);

      const queueCounts = {
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        completed: counts.completed ?? 0,
        failed: counts.failed ?? 0,
        delayed: counts.delayed ?? 0,
        paused: counts.paused ?? 0,
      };

      const status =
        isPaused || (queueCounts.failed > 0 && queueCounts.active === 0)
          ? 'degraded'
          : 'healthy';

      return { name, status, counts: queueCounts, isPaused };
    } catch (error) {
      this.logger.warn(`Health check failed for queue "${name}"`, error);
      return {
        name,
        status: 'unhealthy',
        counts: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: 0,
        },
        isPaused: false,
      };
    }
  }

  private async checkRedis(): Promise<QueueDashboardHealth['redis']> {
    const start = Date.now();
    try {
      const pong = await this.redis.ping();
      const latencyMs = Date.now() - start;

      if (pong !== 'PONG') {
        return {
          status: 'degraded',
          latencyMs,
          message: `Unexpected PING response: ${pong}`,
        };
      }

      return { status: 'healthy', latencyMs };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Redis unreachable';
      return { status: 'unhealthy', latencyMs: null, message };
    }
  }

  private aggregateStatus(
    statuses: Array<'healthy' | 'degraded' | 'unhealthy'>,
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (statuses.includes('unhealthy')) return 'unhealthy';
    if (statuses.includes('degraded')) return 'degraded';
    return 'healthy';
  }
}
