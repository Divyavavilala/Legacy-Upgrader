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
  };
}
