import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles } from '../common/decorators';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { ScansService } from './scans.service';

@ApiTags('scans')
@ApiBearerAuth()
@Controller('scans')
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DEVELOPER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get scan details with findings' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.scansService.findByIdForOrg(id, user.organizationId);
  }

  @Get(':id/progress')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DEVELOPER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get scan progress and current stage' })
  getProgress(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.scansService.getProgress(id, user.organizationId);
  }
}
