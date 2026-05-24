import type { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';
import type { EnvConfig } from '../config/env.validation';

export function createRedisConnectionOptions(
  config: ConfigService<EnvConfig, true>,
): RedisOptions {
  const password = config.get('REDIS_PASSWORD', { infer: true });

  return {
    host: config.get('REDIS_HOST', { infer: true }),
    port: config.get('REDIS_PORT', { infer: true }),
    db: config.get('REDIS_DB', { infer: true }),
    ...(password ? { password } : {}),
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  };
}
