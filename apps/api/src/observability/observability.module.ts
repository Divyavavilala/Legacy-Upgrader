import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsSyncService } from './metrics-sync.service';
import { MetricsService } from './metrics.service';
import { RequestContextMiddleware } from './request-context.middleware';
import { StructuredLoggerService } from './structured-logger.service';
import { StructuredLoggingInterceptor } from './structured-logging.interceptor';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    StructuredLoggerService,
    MetricsService,
    MetricsSyncService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: StructuredLoggingInterceptor,
    },
  ],
  exports: [StructuredLoggerService, MetricsService],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
