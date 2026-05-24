import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditAction, UserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { CurrentUser, Roles } from '../common/decorators';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { MembersService } from '../members/members.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly membersService: MembersService,
    private readonly auditService: AuditService,
  ) {}

  @Get('current')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DEVELOPER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get current organization' })
  async getCurrent(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.getWithSubscription(user.organizationId);
  }

  @Patch('current')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update organization settings' })
  async updateCurrent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrganizationDto,
  ) {
    const org = await this.organizationsService.update(user.organizationId, dto);

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: AuditAction.ORGANIZATION_UPDATED,
      resourceType: 'organization',
      resourceId: org.id,
      metadata: { fields: Object.keys(dto) },
    });

    return org;
  }

  @Get('mine')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DEVELOPER, UserRole.VIEWER)
  @ApiOperation({ summary: 'List organizations the user belongs to' })
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.listUserOrganizations(user.id);
  }

}
