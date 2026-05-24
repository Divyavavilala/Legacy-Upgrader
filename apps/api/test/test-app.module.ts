import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeysModule } from '../src/api-keys/api-keys.module';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AuditModule } from '../src/audit/audit.module';
import { AuthModule } from '../src/auth';
import { validateEnv } from '../src/config/env.validation';
import { MembersModule } from '../src/members/members.module';
import { NotificationsModule } from '../src/notifications/notifications.module';
import { OrganizationsModule } from '../src/organizations';
import { PlatformModule } from '../src/platform/platform.module';
import { PrismaModule } from '../src/prisma';
import { QueueModule } from '../src/queue';
import { RepositoriesModule } from '../src/repositories';
import { ScansModule } from '../src/scans';
import { SecurityModule } from '../src/security/security.module';
import { UsersModule } from '../src/users';

/** E2E test module — excludes BullMQ workers to avoid Redis coupling in HTTP tests */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
    }),
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
    QueueModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class TestAppModule {}
