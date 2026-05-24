import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { HealthCheckResponse } from '@legacyupgrader/shared-types';
import type { EnvConfig } from './config/env.validation';

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  getHealth(): HealthCheckResponse {
    return {
      status: 'ok',
      service: this.config.get('APP_NAME', { infer: true }),
      timestamp: new Date().toISOString(),
    };
  }
}
