import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { EnvConfig } from '../../config/env.validation';
import { REDIS_CLIENT } from '../../queue/redis.module';

@Injectable()
export class AiRateLimiterService {
  private readonly limitPerMinute: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    config: ConfigService<EnvConfig, true>,
  ) {
    this.limitPerMinute = config.get('AI_RATE_LIMIT_PER_MINUTE', { infer: true });
  }

  async acquire(organizationId: string): Promise<void> {
    const key = `ai:rate:${organizationId}:${Math.floor(Date.now() / 60_000)}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 120);
    }
    if (count > this.limitPerMinute) {
      throw new Error(`AI rate limit exceeded for organization (${this.limitPerMinute}/min)`);
    }
  }
}
