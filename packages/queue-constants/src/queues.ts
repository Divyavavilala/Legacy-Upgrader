/** BullMQ queue names (must match worker registrations). */
export const QUEUE_NAMES = {
  REPOSITORY_SCAN: 'repository-scan',
  DEPENDENCY_ANALYSIS: 'dependency-analysis',
  AI_MODERNIZATION: 'ai-modernization',
  REPORT_GENERATION: 'report-generation',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const ALL_QUEUE_NAMES: readonly QueueName[] = Object.values(QUEUE_NAMES);
