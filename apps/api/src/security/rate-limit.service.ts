import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { EnvConfig } from '../config/env.validation';
import { REDIS_CLIENT } from '../queue/redis.module';

@Injectable()
export class RateLimitService {
  private readonly requestsPerMinute: number;
  private readonly apiKeyRequestsPerMinute: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    config: ConfigService<EnvConfig, true>,
  ) {
    this.requestsPerMinute = config.get('RATE_LIMIT_PER_MINUTE', { infer: true });
    this.apiKeyRequestsPerMinute = config.get('API_KEY_RATE_LIMIT_PER_MINUTE', { infer: true });
  }

  async checkOrgLimit(organizationId: string, isApiKey = false): Promise<void> {
    const limit = isApiKey ? this.apiKeyRequestsPerMinute : this.requestsPerMinute;
    const bucket = Math.floor(Date.now() / 60_000);
    const key = `rate:org:${organizationId}:${isApiKey ? 'api' : 'user'}:${bucket}`;
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, 120);
    }

    if (count > limit) {
      throw new HttpException(
        'Rate limit exceeded. Please slow down and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
