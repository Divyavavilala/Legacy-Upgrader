import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppWorkerModule } from './app-worker.module';
import { HttpExceptionFilter } from './common/filters';
import type { EnvConfig } from './config/env.validation';
import { StructuredLoggerService } from './observability/structured-logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppWorkerModule, { bufferLogs: true });
  const config = app.get(ConfigService<EnvConfig, true>);
  const structuredLogger = app.get(StructuredLoggerService);
  const logger = new Logger('WorkerBootstrap');

  app.useLogger(structuredLogger);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  const port = config.get('WORKER_HEALTH_PORT', { infer: true });
  app.setGlobalPrefix('api');

  await app.listen(port);
  logger.log(`Worker health listening on http://localhost:${port}/api/health`);
}

void bootstrap();
