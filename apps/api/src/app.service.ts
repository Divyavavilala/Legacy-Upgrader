import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { HealthCheckResponse } from '@legacyupgrader/shared-types';
import type { EnvConfig } from './config/env.validation';
import { PrismaService } from './prisma';
import { QueueService } from './queue/queue.service';

@Injectable()
export class AppService {
  constructor(
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  getHealth(): HealthCheckResponse {
    return {
      status: 'ok',
      service: this.config.get('APP_NAME', { infer: true }),
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    const checks: Record<string, 'ok' | 'down'> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'down';
    }

    try {
      const queueHealth = await this.queueService.getDashboardHealth();
      checks.redis = queueHealth.redis.status === 'healthy' ? 'ok' : 'down';
    } catch {
      checks.redis = 'down';
    }

    const healthy = Object.values(checks).every((value) => value === 'ok');

    return {
      status: healthy ? 'ok' : 'degraded',
      service: this.config.get('APP_NAME', { infer: true }),
      role: 'api',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
