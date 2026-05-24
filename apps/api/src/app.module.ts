import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth';
import { validateEnv } from './config/env.validation';
import { OrganizationsModule } from './organizations';
import { PrismaModule } from './prisma';
import { QueueModule } from './queue';
import { RepositoriesModule } from './repositories';
import { ScansModule } from './scans';
import { UsersModule } from './users';
import { WorkersModule } from './workers';

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
    WorkersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
