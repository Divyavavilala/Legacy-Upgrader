import { Module } from '@nestjs/common';
import { QueueModule } from '../queue';
import { AiConfigModule } from './ai-config.module';
import { AiHealthController } from './controllers/ai-health.controller';
import { AiProviderRegistry } from './providers/ai-provider.registry';
import { ClaudeProvider } from './providers/claude.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { HeuristicAiProvider } from './providers/heuristic.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { AiCacheService } from './services/ai-cache.service';
import { AiOrchestrationService } from './services/ai-orchestration.service';
import { AiRateLimiterService } from './services/ai-rate-limiter.service';
import { AiTokenAccountingService } from './services/ai-token-accounting.service';
import { RepositoryContextEngineService } from './services/repository-context-engine.service';

/** Core AI services (no agents) — safe for HTTP/scan orchestration layers */
@Module({
  imports: [AiConfigModule, QueueModule],
  controllers: [AiHealthController],
  providers: [
    OpenAiProvider,
    ClaudeProvider,
    GeminiProvider,
    GroqProvider,
    HeuristicAiProvider,
    AiProviderRegistry,
    AiCacheService,
    AiRateLimiterService,
    AiTokenAccountingService,
    RepositoryContextEngineService,
    AiOrchestrationService,
  ],
  exports: [
    AiOrchestrationService,
    AiProviderRegistry,
    RepositoryContextEngineService,
    AiTokenAccountingService,
  ],
})
export class AiCoreModule {}
