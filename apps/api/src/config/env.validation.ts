export interface EnvConfig {
  NODE_ENV: string;
  APP_NAME: string;
  PORT: number;
  CORS_ORIGIN: string;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_PEPPER: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  BCRYPT_ROUNDS: number;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  REDIS_DB: number;
  SCAN_WORKSPACE_ROOT: string;
  SCAN_CLONE_TIMEOUT_MS: number;
  SCAN_TOTAL_TIMEOUT_MS: number;
  SCAN_CLONE_DEPTH: number;
  SCAN_CLONE_MAX_RETRIES: number;
  AI_ENABLED: boolean;
  AI_AUTO_RUN_AFTER_SCAN: boolean;
  AI_DEFAULT_PROVIDER: 'openai' | 'claude' | 'gemini' | 'groq' | 'heuristic';
  AI_FALLBACK_PROVIDER: 'openai' | 'claude' | 'gemini' | 'groq' | 'heuristic';
  AI_MAX_TOKENS_PER_REQUEST: number;
  AI_MAX_CONTEXT_CHARS: number;
  AI_RATE_LIMIT_PER_MINUTE: number;
  RATE_LIMIT_PER_MINUTE: number;
  API_KEY_RATE_LIMIT_PER_MINUTE: number;
  AI_CACHE_TTL_SECONDS: number;
  AI_REQUEST_TIMEOUT_MS: number;
  AI_JOB_TIMEOUT_MS: number;
  AI_PROVIDER_MAX_RETRIES: number;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL: string;
  OPENAI_BASE_URL: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL: string;
  LOG_FORMAT: 'json' | 'text';
  METRICS_ENABLED: boolean;
  TRUST_PROXY: boolean;
  SWAGGER_ENABLED: boolean;
  WORKER_HEALTH_PORT: number;
  RUN_MIGRATIONS: boolean;
}

function readString(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid or missing environment variable: ${key}`);
  }
  return value;
}

function readOptionalString(config: Record<string, unknown>, key: string): string | undefined {
  const value = config[key];
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${key}: must be a string`);
  }
  return value;
}

function readBool(config: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const raw = config[key];
  if (raw === undefined || raw === null || raw === '') {
    return fallback;
  }
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    return raw.toLowerCase() === 'true' || raw === '1';
  }
  return fallback;
}

const AI_PROVIDERS = ['openai', 'claude', 'gemini', 'groq', 'heuristic'] as const;

function readAiProvider(
  config: Record<string, unknown>,
  key: string,
  fallback: (typeof AI_PROVIDERS)[number],
): (typeof AI_PROVIDERS)[number] {
  const raw = config[key] ?? fallback;
  if (typeof raw !== 'string' || !AI_PROVIDERS.includes(raw as (typeof AI_PROVIDERS)[number])) {
    throw new Error(`Invalid ${key}: must be one of ${AI_PROVIDERS.join(', ')}`);
  }
  return raw as (typeof AI_PROVIDERS)[number];
}

function readInt(config: Record<string, unknown>, key: string, fallback: number): number {
  const raw = config[key] ?? fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid ${key}: must be a non-negative integer`);
  }
  return value;
}

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const port = Number(config.PORT ?? 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Invalid PORT: must be an integer between 1 and 65535');
  }

  const bcryptRounds = readInt(config, 'BCRYPT_ROUNDS', 12);
  if (bcryptRounds < 10 || bcryptRounds > 15) {
    throw new Error('Invalid BCRYPT_ROUNDS: must be between 10 and 15');
  }

  const redisPort = readInt(config, 'REDIS_PORT', 6379);
  if (redisPort < 1 || redisPort > 65535) {
    throw new Error('Invalid REDIS_PORT: must be between 1 and 65535');
  }

  const redisDb = readInt(config, 'REDIS_DB', 0);
  if (redisDb < 0 || redisDb > 15) {
    throw new Error('Invalid REDIS_DB: must be between 0 and 15');
  }

  const scanCloneTimeoutMs = readInt(config, 'SCAN_CLONE_TIMEOUT_MS', 300_000);
  const scanTotalTimeoutMs = readInt(config, 'SCAN_TOTAL_TIMEOUT_MS', 600_000);
  const scanCloneDepth = readInt(config, 'SCAN_CLONE_DEPTH', 1);
  const scanCloneMaxRetries = readInt(config, 'SCAN_CLONE_MAX_RETRIES', 2);

  if (scanCloneTimeoutMs < 10_000) {
    throw new Error('Invalid SCAN_CLONE_TIMEOUT_MS: must be at least 10000');
  }
  if (scanTotalTimeoutMs < scanCloneTimeoutMs) {
    throw new Error('Invalid SCAN_TOTAL_TIMEOUT_MS: must be >= SCAN_CLONE_TIMEOUT_MS');
  }

  return {
    NODE_ENV: readString(config, 'NODE_ENV'),
    APP_NAME: readString(config, 'APP_NAME'),
    PORT: port,
    CORS_ORIGIN: readString(config, 'CORS_ORIGIN'),
    DATABASE_URL: readString(config, 'DATABASE_URL'),
    JWT_ACCESS_SECRET: readString(config, 'JWT_ACCESS_SECRET'),
    JWT_REFRESH_SECRET: readString(config, 'JWT_REFRESH_SECRET'),
    JWT_REFRESH_PEPPER: readString(config, 'JWT_REFRESH_PEPPER'),
    JWT_ACCESS_EXPIRES_IN: readString(config, 'JWT_ACCESS_EXPIRES_IN'),
    JWT_REFRESH_EXPIRES_IN: readString(config, 'JWT_REFRESH_EXPIRES_IN'),
    BCRYPT_ROUNDS: bcryptRounds,
    REDIS_HOST: readString(config, 'REDIS_HOST'),
    REDIS_PORT: redisPort,
    REDIS_PASSWORD: readOptionalString(config, 'REDIS_PASSWORD'),
    REDIS_DB: redisDb,
    SCAN_WORKSPACE_ROOT: readOptionalString(config, 'SCAN_WORKSPACE_ROOT') ?? 'tmp/scans',
    SCAN_CLONE_TIMEOUT_MS: scanCloneTimeoutMs,
    SCAN_TOTAL_TIMEOUT_MS: scanTotalTimeoutMs,
    SCAN_CLONE_DEPTH: scanCloneDepth,
    SCAN_CLONE_MAX_RETRIES: scanCloneMaxRetries,
    AI_ENABLED: readBool(config, 'AI_ENABLED', true),
    AI_AUTO_RUN_AFTER_SCAN: readBool(config, 'AI_AUTO_RUN_AFTER_SCAN', true),
    AI_DEFAULT_PROVIDER: readAiProvider(config, 'AI_DEFAULT_PROVIDER', 'openai'),
    AI_FALLBACK_PROVIDER: readAiProvider(config, 'AI_FALLBACK_PROVIDER', 'heuristic'),
    AI_MAX_TOKENS_PER_REQUEST: readInt(config, 'AI_MAX_TOKENS_PER_REQUEST', 4096),
    AI_MAX_CONTEXT_CHARS: readInt(config, 'AI_MAX_CONTEXT_CHARS', 32_000),
    AI_RATE_LIMIT_PER_MINUTE: readInt(config, 'AI_RATE_LIMIT_PER_MINUTE', 30),
    RATE_LIMIT_PER_MINUTE: readInt(config, 'RATE_LIMIT_PER_MINUTE', 120),
    API_KEY_RATE_LIMIT_PER_MINUTE: readInt(config, 'API_KEY_RATE_LIMIT_PER_MINUTE', 60),
    AI_CACHE_TTL_SECONDS: readInt(config, 'AI_CACHE_TTL_SECONDS', 3600),
    AI_REQUEST_TIMEOUT_MS: readInt(config, 'AI_REQUEST_TIMEOUT_MS', 120_000),
    AI_JOB_TIMEOUT_MS: readInt(config, 'AI_JOB_TIMEOUT_MS', 600_000),
    AI_PROVIDER_MAX_RETRIES: readInt(config, 'AI_PROVIDER_MAX_RETRIES', 2),
    OPENAI_API_KEY: readOptionalString(config, 'OPENAI_API_KEY'),
    OPENAI_MODEL: readOptionalString(config, 'OPENAI_MODEL') ?? 'gpt-4o-mini',
    OPENAI_BASE_URL: readOptionalString(config, 'OPENAI_BASE_URL') ?? 'https://api.openai.com/v1',
    ANTHROPIC_API_KEY: readOptionalString(config, 'ANTHROPIC_API_KEY'),
    ANTHROPIC_MODEL:
      readOptionalString(config, 'ANTHROPIC_MODEL') ?? 'claude-3-5-haiku-20241022',
    GEMINI_API_KEY: readOptionalString(config, 'GEMINI_API_KEY'),
    GEMINI_MODEL: readOptionalString(config, 'GEMINI_MODEL') ?? 'gemini-1.5-flash',
    GROQ_API_KEY: readOptionalString(config, 'GROQ_API_KEY'),
    GROQ_MODEL: readOptionalString(config, 'GROQ_MODEL') ?? 'llama-3.3-70b-versatile',
    LOG_FORMAT: readLogFormat(config),
    METRICS_ENABLED: readBool(config, 'METRICS_ENABLED', true),
    TRUST_PROXY: readBool(config, 'TRUST_PROXY', false),
    SWAGGER_ENABLED: readBool(
      config,
      'SWAGGER_ENABLED',
      readString(config, 'NODE_ENV') !== 'production',
    ),
    WORKER_HEALTH_PORT: readInt(config, 'WORKER_HEALTH_PORT', 3001),
    RUN_MIGRATIONS: readBool(config, 'RUN_MIGRATIONS', false),
  };
}

function readLogFormat(config: Record<string, unknown>): 'json' | 'text' {
  const raw = config.LOG_FORMAT ?? (config.NODE_ENV === 'production' ? 'json' : 'text');
  if (raw === 'json' || raw === 'text') {
    return raw;
  }
  throw new Error('Invalid LOG_FORMAT: must be json or text');
}
