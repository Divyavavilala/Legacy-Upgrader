import { Module } from '@nestjs/common';
import { QueueModule } from '../queue';
import { ScanProcessorService } from './scan-processor.service';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';

@Module({
  imports: [QueueModule],
  controllers: [ScansController],
  providers: [ScansService, ScanProcessorService],
  exports: [ScansService, ScanProcessorService],
})
export class ScansModule {}
