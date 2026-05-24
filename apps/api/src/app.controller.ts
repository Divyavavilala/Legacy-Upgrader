import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators';
import type { HealthCheckResponse } from '@legacyupgrader/shared-types';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  getHealth(): HealthCheckResponse {
    return this.appService.getHealth();
  }
}
