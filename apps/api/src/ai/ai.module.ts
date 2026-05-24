import { Module } from '@nestjs/common';
import { AiAgentsModule } from './ai-agents.module';
import { AiCoreModule } from './ai-core.module';

@Module({
  imports: [AiCoreModule, AiAgentsModule],
  exports: [AiCoreModule, AiAgentsModule],
})
export class AiModule {}
