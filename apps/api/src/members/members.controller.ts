import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, Public, Roles } from '../common/decorators';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { MembersService } from './members.service';

@ApiTags('members')
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DEVELOPER, UserRole.VIEWER)
  @ApiOperation({ summary: 'List organization members' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.listMembers(user.organizationId);
  }

  @Get('invitations')
  @ApiBearerAuth()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List pending invitations' })
  listInvitations(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.listInvitations(user.organizationId);
  }

  @Post('invite')
  @ApiBearerAuth()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Invite a member by email' })
  invite(@CurrentUser() user: AuthenticatedUser, @Body() dto: InviteMemberDto) {
    return this.membersService.invite(user.organizationId, user.id, dto);
  }

  @Public()
  @Post('accept-invitation')
  @ApiOperation({ summary: 'Accept organization invitation' })
  accept(@Body() dto: AcceptInvitationDto) {
    return this.membersService.acceptInvitation(dto);
  }

  @Patch(':userId/role')
  @ApiBearerAuth()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update member role' })
  updateRole(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.membersService.updateRole(
      user.organizationId,
      userId,
      dto.role,
      user.id,
      user.role,
    );
  }

  @Delete(':userId')
  @ApiBearerAuth()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from organization' })
  async remove(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.membersService.removeMember(
      user.organizationId,
      userId,
      user.id,
      user.role,
    );
  }
}
