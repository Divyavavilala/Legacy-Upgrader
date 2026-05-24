import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../queue/redis.module';

@Injectable()
export class AiCacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  buildRequestHash(payload: string): string {
    return createHash('sha256').update(payload).digest('hex');
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(`ai:cache:${key}`);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.setex(`ai:cache:${key}`, ttlSeconds, value);
  }
}
