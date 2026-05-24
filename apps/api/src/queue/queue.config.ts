import {
  QUEUE_DEFAULT_JOB_OPTIONS,
  type QueueDefaultJobOptions,
  type QueueName,
} from '@legacyupgrader/queue-constants';
import type { JobsOptions } from 'bullmq';

export function toBullMqJobOptions(options: QueueDefaultJobOptions): JobsOptions {
  return {
    attempts: options.attempts,
    backoff: options.backoff,
    removeOnComplete: { count: options.removeOnComplete },
    removeOnFail: { count: options.removeOnFail },
  };
}

export function getDefaultJobOptionsForQueue(name: QueueName): JobsOptions {
  return toBullMqJobOptions(QUEUE_DEFAULT_JOB_OPTIONS[name]);
}
