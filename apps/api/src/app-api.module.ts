import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth';
import { validateEnv } from './config/env.validation';
import { AiModule } from './ai/ai.module';
import { MembersModule } from './members/members.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ObservabilityModule } from './observability/observability.module';
import { OrganizationsModule } from './organizations';
import { PlatformModule } from './platform/platform.module';
import { PrismaModule } from './prisma';
import { QueueModule } from './queue';
import { RepositoriesModule } from './repositories';
import { ScansModule } from './scans';
import { SecurityModule } from './security/security.module';
import { UsersModule } from './users';

/** HTTP API process — enqueues jobs; does not run BullMQ workers. */
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
    SecurityModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    MembersModule,
    ApiKeysModule,
    RepositoriesModule,
    ScansModule,
    AiModule,
    QueueModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppApiModule {}
