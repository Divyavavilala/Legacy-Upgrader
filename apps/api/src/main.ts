import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppApiModule } from './app-api.module';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters';
import { TransformResponseInterceptor } from './common/interceptors';
import type { EnvConfig } from './config/env.validation';
import { StructuredLoggerService } from './observability/structured-logger.service';

async function bootstrap(): Promise<void> {
  const rootModule = process.env.API_ONLY === 'true' ? AppApiModule : AppModule;
  const app = await NestFactory.create(rootModule, { bufferLogs: true });
  const config = app.get(ConfigService<EnvConfig, true>);
  const structuredLogger = app.get(StructuredLoggerService);
  const logger = new Logger('Bootstrap');

  app.useLogger(structuredLogger);

  if (config.get('TRUST_PROXY', { infer: true })) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: config.get('NODE_ENV', { infer: true }) === 'production',
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidUnknownValues: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  const corsOrigin = config.get('CORS_ORIGIN', { infer: true });
  const appName = config.get('APP_NAME', { infer: true });

  app.setGlobalPrefix('api');

  const origins = corsOrigin.split(',').map((value) => value.trim()).filter(Boolean);
  app.enableCors({
    origin: origins.length === 1 ? origins[0] : origins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-Id'],
  });

  if (config.get('SWAGGER_ENABLED', { infer: true })) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(appName)
      .setDescription('Legacy codebase discovery, scanning, and modernization APIs')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  logger.log(`API listening on http://localhost:${port}/api`);
}

void bootstrap();
