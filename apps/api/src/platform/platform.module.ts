import { Global, Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlansService } from './plans.service';
import { QuotasService } from './quotas.service';
import { SubscriptionsService } from './subscriptions.service';
import { UsageService } from './usage.service';

@Global()
@Module({
  controllers: [PlatformController],
  providers: [PlansService, SubscriptionsService, UsageService, QuotasService],
  exports: [PlansService, SubscriptionsService, UsageService, QuotasService],
})
export class PlatformModule {}
