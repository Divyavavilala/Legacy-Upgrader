import { Module } from '@nestjs/common';
import { AiCoreModule } from '../ai/ai-core.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { QueueModule } from '../queue';
import { ScanProcessorService } from './scan-processor.service';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';
import { ModernizationOutputService } from './services/modernization-output.service';
import { ReportExportService } from './services/report-export.service';
import { ZipExportService } from './services/zip-export.service';

@Module({
  imports: [QueueModule, AnalysisModule, AiCoreModule],
  controllers: [ScansController],
  providers: [
    ScansService,
    ScanProcessorService,
    ModernizationOutputService,
    ReportExportService,
    ZipExportService,
  ],
  exports: [ScansService, ScanProcessorService],
})
export class ScansModule {}
