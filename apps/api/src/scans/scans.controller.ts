import { Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
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
  @ApiOperation({ summary: 'Get scan details with findings, recommendations, and metrics' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.scansService.findByIdForOrg(id, user.organizationId);
  }

  @Get(':id/progress')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DEVELOPER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get scan progress and current stage' })
  getProgress(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.scansService.getProgress(id, user.organizationId);
  }

  @Get(':id/ai-report')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DEVELOPER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get AI modernization report and insights' })
  getAiReport(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.scansService.getAiReport(id, user.organizationId);
  }

  @Post(':id/retry')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Retry scan by triggering a new scan on the repository' })
  retry(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.scansService.retryScan(id, user);
  }

  @Get(':id/generated-output')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DEVELOPER, UserRole.VIEWER)
  @ApiOperation({ summary: 'List generated modernization output files' })
  getGeneratedOutput(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.scansService.getGeneratedOutput(id, user.organizationId);
  }

  @Get(':id/report/markdown')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DEVELOPER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Download modernization report as Markdown' })
  async reportMarkdown(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const markdown = await this.scansService.getReportMarkdown(id, user.organizationId);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="modernization-report-${id.slice(0, 8)}.md"`,
    );
    res.send(markdown);
  }

  @Get(':id/report/pdf')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DEVELOPER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Download modernization report as PDF' })
  async reportPdf(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.scansService.getReportPdf(id, user.organizationId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="modernization-report-${id.slice(0, 8)}.pdf"`,
    );
    res.send(buffer);
  }

  @Get(':id/output.zip')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DEVELOPER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Download generated modernization output as ZIP' })
  async outputZip(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.scansService.getOutputZip(id, user.organizationId);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="modernized-output-${id.slice(0, 8)}.zip"`,
    );
    res.send(buffer);
  }
}
