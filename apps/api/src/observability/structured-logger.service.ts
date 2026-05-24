import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../config/env.validation';

export interface LogPayload {
  level: string;
  message: string;
  context?: string;
  requestId?: string;
  durationMs?: number;
  statusCode?: number;
  method?: string;
  path?: string;
  error?: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}

@Injectable()
export class StructuredLoggerService implements LoggerService {
  private readonly json: boolean;

  constructor(config: ConfigService<EnvConfig, true>) {
    const format = config.get('LOG_FORMAT', { infer: true });
    this.json = format === 'json';
  }

  log(message: string, context?: string): void {
    this.write('log', message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.write('error', message, context, { error: trace });
  }

  warn(message: string, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: string, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: string, context?: string): void {
    this.write('verbose', message, context);
  }

  http(payload: Omit<LogPayload, 'level' | 'timestamp'>): void {
    this.emit({ level: 'info', timestamp: new Date().toISOString(), ...payload });
  }

  private write(
    level: LogLevel,
    message: string,
    context?: string,
    extra?: Partial<LogPayload>,
  ): void {
    this.emit({
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      ...extra,
    });
  }

  private emit(payload: LogPayload): void {
    if (this.json) {
      process.stdout.write(`${JSON.stringify(payload)}\n`);
      return;
    }

    const prefix = payload.context ? `[${payload.context}] ` : '';
    const line = `${payload.timestamp} ${payload.level.toUpperCase()} ${prefix}${payload.message}`;
    if (payload.level === 'error') {
      console.error(line);
    } else if (payload.level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}
