import { Module } from '@nestjs/common';
import { AiAgentsModule } from '../ai/ai-agents.module';
import { QueueModule } from '../queue';
import { ScansModule } from '../scans';
import { AiArchitectureAnalysisWorker } from './ai-architecture-analysis.worker';
import { AiModernizationWorker } from './ai-modernization.worker';
import { AiSecurityReviewWorker } from './ai-security-review.worker';
import { DependencyAnalysisWorker } from './dependency-analysis.worker';
import { ReportGenerationWorker } from './report-generation.worker';
import { RepositoryScanWorker } from './repository-scan.worker';

@Module({
  imports: [QueueModule, ScansModule, AiAgentsModule],
  providers: [
    RepositoryScanWorker,
    DependencyAnalysisWorker,
    AiModernizationWorker,
    AiSecurityReviewWorker,
    AiArchitectureAnalysisWorker,
    ReportGenerationWorker,
  ],
})
export class WorkersModule {}
