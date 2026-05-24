import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('health')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Platform health dashboard (org owners)' })
  getHealth() {
    return this.adminService.getPlatformHealth();
  }
}
