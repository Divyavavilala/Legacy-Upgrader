import { Module } from '@nestjs/common';
import { AnalysisModule } from '../analysis/analysis.module';
import { QueueModule } from '../queue';
import { ScanProcessorService } from './scan-processor.service';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';

@Module({
  imports: [QueueModule, AnalysisModule],
  controllers: [ScansController],
  providers: [ScansService, ScanProcessorService],
  exports: [ScansService, ScanProcessorService],
})
export class ScansModule {}
