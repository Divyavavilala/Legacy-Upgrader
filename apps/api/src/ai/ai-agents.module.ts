import { Module } from '@nestjs/common';
import { ArchitectureReviewAgent } from './agents/architecture-review.agent';
import { BackendMigrationAgent } from './agents/backend-migration.agent';
import { DependencyModernizationAgent } from './agents/dependency-modernization.agent';
import { DevOpsModernizationAgent } from './agents/devops-modernization.agent';
import { FrontendMigrationAgent } from './agents/frontend-migration.agent';
import { SecurityReviewAgent } from './agents/security-review.agent';
import { AiCoreModule } from './ai-core.module';
import { AiModernizationPipeline } from './pipeline/ai-modernization.pipeline';

/** Agent + pipeline wiring — loaded by BullMQ workers */
@Module({
  imports: [AiCoreModule],
  providers: [
    DependencyModernizationAgent,
    ArchitectureReviewAgent,
    SecurityReviewAgent,
    FrontendMigrationAgent,
    BackendMigrationAgent,
    DevOpsModernizationAgent,
    AiModernizationPipeline,
  ],
  exports: [AiModernizationPipeline],
})
export class AiAgentsModule {}
