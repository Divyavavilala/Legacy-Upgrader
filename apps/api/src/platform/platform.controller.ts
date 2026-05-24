import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles } from '../common/decorators';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { PlansService } from './plans.service';
import { QuotasService } from './quotas.service';
import { UsageService } from './usage.service';

@ApiTags('platform')
@ApiBearerAuth()
@Controller('platform')
export class PlatformController {
  constructor(
    private readonly quotasService: QuotasService,
    private readonly usageService: UsageService,
    private readonly plansService: PlansService,
  ) {}

  @Get('usage')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DEVELOPER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Current organization usage metrics' })
  getUsage(@CurrentUser() user: AuthenticatedUser) {
    return this.usageService.getCurrentUsage(user.organizationId);
  }

  @Get('entitlements')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DEVELOPER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Plan limits and remaining quota' })
  getEntitlements(@CurrentUser() user: AuthenticatedUser) {
    return this.quotasService.getEntitlements(user.organizationId);
  }

  @Get('plans')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List available subscription plans (billing-ready)' })
  listPlans() {
    return this.plansService.findAll();
  }
}
