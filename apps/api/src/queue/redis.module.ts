import { Global, Inject, Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import Redis from 'ioredis';
import type { EnvConfig } from '../config/env.validation';
import { createRedisConnectionOptions } from './redis.config';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Injectable()
class RedisShutdownHook implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisShutdownHook.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Closing Redis connection (signal: ${signal ?? 'unknown'})…`);
    await this.redis.quit();
  }
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => {
        return new Redis(createRedisConnectionOptions(config));
      },
    },
    RedisShutdownHook,
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
