import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles } from '../common/decorators';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { ScansService } from '../scans';
import { CreateRepositoryDto } from './dto';
import { RepositoriesService } from './repositories.service';

@ApiTags('repositories')
@ApiBearerAuth()
@Controller('repositories')
export class RepositoriesController {
  constructor(
    private readonly repositoriesService: RepositoriesService,
    private readonly scansService: ScansService,
  ) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Register a repository for the organization' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRepositoryDto) {
    return this.repositoriesService.create(user.organizationId, dto);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DEVELOPER, UserRole.VIEWER)
  @ApiOperation({ summary: 'List organization repositories' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.repositoriesService.findAllByOrganization(user.organizationId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DEVELOPER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get repository by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.repositoriesService.findByIdForOrganization(id, user.organizationId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a repository (OWNER/ADMIN only)' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.repositoriesService.remove(id, user.organizationId);
  }

  @Post(':id/scan')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Trigger a repository scan' })
  triggerScan(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.scansService.triggerScan(id, user);
  }

  @Get(':id/scans')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DEVELOPER, UserRole.VIEWER)
  @ApiOperation({ summary: 'List scans for a repository' })
  listScans(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.scansService.listByRepository(id, user.organizationId);
  }
}
