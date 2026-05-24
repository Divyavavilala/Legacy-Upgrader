import { Module } from '@nestjs/common';
import { ArchitectureAnalyzer } from './architecture/architecture-analyzer.service';
import { DependencyAnalyzer } from './dependency/dependency-analyzer.service';
import { FrameworkAnalyzer } from './framework/framework-analyzer.service';
import { GitAnalyzer } from './git/git-analyzer.service';
import { GitCloneService } from './git/git-clone.service';
import { ScanAnalysisPipeline } from './pipeline/scan-analysis.pipeline';
import { ScanProgressService } from './pipeline/scan-progress.service';
import { RecommendationEngine } from './recommendation/recommendation-engine.service';
import { WorkspaceManagerService } from './workspace/workspace-manager.service';

@Module({
  providers: [
    WorkspaceManagerService,
    GitCloneService,
    GitAnalyzer,
    FrameworkAnalyzer,
    DependencyAnalyzer,
    ArchitectureAnalyzer,
    RecommendationEngine,
    ScanProgressService,
    ScanAnalysisPipeline,
  ],
  exports: [
    ScanAnalysisPipeline,
    ScanProgressService,
    WorkspaceManagerService,
    GitCloneService,
    FrameworkAnalyzer,
    DependencyAnalyzer,
    ArchitectureAnalyzer,
    RecommendationEngine,
    GitAnalyzer,
  ],
})
export class AnalysisModule {}
