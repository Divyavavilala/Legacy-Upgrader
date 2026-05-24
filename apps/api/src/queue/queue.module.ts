import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ALL_QUEUE_NAMES, type QueueName, } from '@legacyupgrader/queue-constants';
import type { EnvConfig } from '../config/env.validation';
import { createRedisConnectionOptions } from './redis.config';
import { getDefaultJobOptionsForQueue } from './queue.config';
import { QueueHealthController } from './queue-health.controller';
import { QueueService } from './queue.service';
import { RedisModule } from './redis.module';

@Module({
  imports: [
    RedisModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        connection: createRedisConnectionOptions(config),
      }),
    }),
    BullModule.registerQueue(
      ...ALL_QUEUE_NAMES.map((name: QueueName) => ({
        name,
        defaultJobOptions: getDefaultJobOptionsForQueue(name),
      })),
    ),
  ],
  controllers: [QueueHealthController],
  providers: [QueueService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
