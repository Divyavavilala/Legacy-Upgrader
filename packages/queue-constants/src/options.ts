import type { QueueName } from './queues.js';

export interface QueueBackoffOptions {
  type: 'exponential' | 'fixed';
  delay: number;
}

export interface QueueDefaultJobOptions {
  attempts: number;
  backoff: QueueBackoffOptions;
  removeOnComplete: number;
  removeOnFail: number;
}

export interface QueueWorkerOptions {
  concurrency: number;
}

export const QUEUE_DEFAULT_JOB_OPTIONS: Record<QueueName, QueueDefaultJobOptions> = {
  'repository-scan': {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: 500,
    removeOnFail: 1_000,
  },
  'dependency-analysis': {
    attempts: 4,
    backoff: { type: 'exponential', delay: 3_000 },
    removeOnComplete: 500,
    removeOnFail: 1_000,
  },
  'ai-modernization': {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10_000 },
    removeOnComplete: 200,
    removeOnFail: 500,
  },
  'report-generation': {
    attempts: 4,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: 500,
    removeOnFail: 1_000,
  },
};

export const QUEUE_WORKER_CONCURRENCY: Record<QueueName, QueueWorkerOptions> = {
  'repository-scan': { concurrency: 2 },
  'dependency-analysis': { concurrency: 3 },
  'ai-modernization': { concurrency: 1 },
  'report-generation': { concurrency: 2 },
};
