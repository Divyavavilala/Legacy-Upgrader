import { Global, Module } from '@nestjs/common';
import { OrgIsolationService } from './org-isolation.service';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitService } from './rate-limit.service';

@Global()
@Module({
  providers: [RateLimitService, OrgIsolationService, RateLimitGuard],
  exports: [RateLimitService, OrgIsolationService, RateLimitGuard],
})
export class SecurityModule {}
