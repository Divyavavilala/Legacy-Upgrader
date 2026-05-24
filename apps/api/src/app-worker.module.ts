import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { AiModule } from './ai/ai.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ObservabilityModule } from './observability/observability.module';
import { PlatformModule } from './platform/platform.module';
import { PrismaModule } from './prisma';
import { QueueModule } from './queue';
import { ScansModule } from './scans';
import { WorkerHealthController } from './workers/worker-health.controller';
import { WorkersModule } from './workers';

/** BullMQ worker process — consumes queues; minimal HTTP for health/metrics. */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
    }),
    ObservabilityModule,
    PrismaModule,
    PlatformModule,
    AuditModule,
    NotificationsModule,
    QueueModule,
    ScansModule,
    AiModule,
    WorkersModule,
  ],
  controllers: [WorkerHealthController],
})
export class AppWorkerModule {}
