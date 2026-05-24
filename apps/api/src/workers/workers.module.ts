import { Module } from '@nestjs/common';
import { QueueModule } from '../queue';
import { ScansModule } from '../scans';
import { AiModernizationWorker } from './ai-modernization.worker';
import { DependencyAnalysisWorker } from './dependency-analysis.worker';
import { ReportGenerationWorker } from './report-generation.worker';
import { RepositoryScanWorker } from './repository-scan.worker';

@Module({
  imports: [QueueModule, ScansModule],
  providers: [
    RepositoryScanWorker,
    DependencyAnalysisWorker,
    AiModernizationWorker,
    ReportGenerationWorker,
  ],
})
export class WorkersModule {}
