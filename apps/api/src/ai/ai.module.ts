import { Module } from '@nestjs/common';
import { AiAgentsModule } from './ai-agents.module';
import { AiConfigModule } from './ai-config.module';
import { AiCoreModule } from './ai-core.module';

@Module({
  imports: [AiConfigModule, AiCoreModule, AiAgentsModule],
  exports: [AiConfigModule, AiCoreModule, AiAgentsModule],
})
export class AiModule {}
