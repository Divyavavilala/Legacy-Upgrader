import type { QueueName } from '@legacyupgrader/queue-constants';

export type QueueHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface QueueCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface SingleQueueHealth {
  name: QueueName;
  status: QueueHealthStatus;
  counts: QueueCounts;
  isPaused: boolean;
}

export interface QueueDashboardHealth {
  status: QueueHealthStatus;
  redis: {
    status: QueueHealthStatus;
    latencyMs: number | null;
    message?: string;
  };
  queues: SingleQueueHealth[];
  checkedAt: string;
}
