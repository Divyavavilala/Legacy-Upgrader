import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators';
import { PrismaService } from '../prisma';
import { QueueService } from '../queue/queue.service';

@Controller()
export class WorkerHealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  @Public()
  @Get('health')
  live() {
    return { status: 'ok', role: 'worker', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('health/ready')
  async ready() {
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

    const healthy = Object.values(checks).every((v) => v === 'ok');

    return {
      status: healthy ? 'ok' : 'degraded',
      role: 'worker',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
