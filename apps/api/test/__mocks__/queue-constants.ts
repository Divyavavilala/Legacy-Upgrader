export const QUEUE_NAMES = {
  REPOSITORY_SCAN: 'repository-scan',
  DEPENDENCY_ANALYSIS: 'dependency-analysis',
  AI_MODERNIZATION: 'ai-modernization',
  AI_SECURITY_REVIEW: 'ai-security-review',
  AI_ARCHITECTURE_ANALYSIS: 'ai-architecture-analysis',
  REPORT_GENERATION: 'report-generation',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const ALL_QUEUE_NAMES: readonly QueueName[] = Object.values(QUEUE_NAMES);

export const QUEUE_DEFAULT_JOB_OPTIONS = {
  'repository-scan': {
    attempts: 5,
    backoff: { type: 'exponential' as const, delay: 5_000 },
    removeOnComplete: 500,
    removeOnFail: 1_000,
  },
  'dependency-analysis': {
    attempts: 4,
    backoff: { type: 'exponential' as const, delay: 3_000 },
    removeOnComplete: 500,
    removeOnFail: 1_000,
  },
  'ai-modernization': {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 10_000 },
    removeOnComplete: 200,
    removeOnFail: 500,
  },
  'ai-security-review': {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 8_000 },
    removeOnComplete: 200,
    removeOnFail: 500,
  },
  'ai-architecture-analysis': {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 8_000 },
    removeOnComplete: 200,
    removeOnFail: 500,
  },
  'report-generation': {
    attempts: 4,
    backoff: { type: 'exponential' as const, delay: 5_000 },
    removeOnComplete: 500,
    removeOnFail: 1_000,
  },
};

export const QUEUE_WORKER_CONCURRENCY = {
  'repository-scan': { concurrency: 2 },
  'dependency-analysis': { concurrency: 3 },
  'ai-modernization': { concurrency: 1 },
  'ai-security-review': { concurrency: 2 },
  'ai-architecture-analysis': { concurrency: 2 },
  'report-generation': { concurrency: 2 },
};

export type RepositoryScanJobPayload = {
  organizationId: string;
  scanId: string;
  repositoryId: string;
  requestedByUserId?: string;
  branch?: string;
  commitSha?: string;
};
