import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { REQUEST_ID_HEADER } from './request-context.middleware';
import { StructuredLoggerService } from './structured-logger.service';

@Injectable()
export class StructuredLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: StructuredLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request & { requestId?: string }>();
    const response = http.getResponse<Response>();
    const started = Date.now();
    const requestId =
      request.requestId ??
      (typeof request.headers[REQUEST_ID_HEADER] === 'string'
        ? request.headers[REQUEST_ID_HEADER]
        : undefined);

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.http({
            message: 'request completed',
            method: request.method,
            path: request.originalUrl,
            statusCode: response.statusCode,
            durationMs: Date.now() - started,
            requestId,
          });
        },
        error: (error: unknown) => {
          const status =
            typeof error === 'object' &&
            error !== null &&
            'status' in error &&
            typeof error.status === 'number'
              ? error.status
              : 500;
          this.logger.http({
            message: 'request failed',
            method: request.method,
            path: request.originalUrl,
            statusCode: status,
            durationMs: Date.now() - started,
            requestId,
            error: error instanceof Error ? error.message : String(error),
          });
        },
      }),
    );
  }
}
