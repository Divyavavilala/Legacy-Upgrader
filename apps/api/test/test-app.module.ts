import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AuthModule } from '../src/auth';
import { validateEnv } from '../src/config/env.validation';
import { OrganizationsModule } from '../src/organizations';
import { PrismaModule } from '../src/prisma';
import { QueueModule } from '../src/queue';
import { RepositoriesModule } from '../src/repositories';
import { ScansModule } from '../src/scans';
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
    AuthModule,
    UsersModule,
    OrganizationsModule,
    RepositoriesModule,
    ScansModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class TestAppModule {}
