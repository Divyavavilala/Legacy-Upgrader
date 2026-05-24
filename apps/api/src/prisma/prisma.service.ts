import {
  BeforeApplicationShutdown,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy, BeforeApplicationShutdown
{
  private readonly logger = new Logger(PrismaService.name);
  private disconnected = false;

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect('module destroy');
  }

  async beforeApplicationShutdown(): Promise<void> {
    await this.disconnect('application shutdown');
  }

  private async disconnect(reason: string): Promise<void> {
    if (this.disconnected) {
      return;
    }
    this.disconnected = true;
    await this.$disconnect();
    this.logger.log(`Database connection closed (${reason})`);
  }
}
