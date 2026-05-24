import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { AiCacheService } from '../services/ai-cache.service';
import { AiRateLimiterService } from '../services/ai-rate-limiter.service';
import { AiTokenAccountingService } from '../services/ai-token-accounting.service';
import { RepositoryContextEngineService } from '../services/repository-context-engine.service';
import { BaseAiAgent } from './base-ai.agent';

@Injectable()
export class ArchitectureReviewAgent extends BaseAiAgent {
  readonly focusLabel = 'Semantic architecture and modularity analysis';

  protected readonly systemPrompt = `You are a principal software architect for LegacyUpgrader.
Perform semantic architecture analysis: code organization, anti-patterns, duplicated responsibilities,
weak modularity, separation of concerns, and legacy structural risks.
Respond ONLY with valid JSON.`;

  constructor(
    providerRegistry: AiProviderRegistry,
    contextEngine: RepositoryContextEngineService,
    tokenAccounting: AiTokenAccountingService,
    cache: AiCacheService,
    rateLimiter: AiRateLimiterService,
    config: ConfigService<EnvConfig, true>,
  ) {
    super(
      'architecture-review',
      providerRegistry,
      contextEngine,
      tokenAccounting,
      cache,
      rateLimiter,
      config.get('AI_CACHE_TTL_SECONDS', { infer: true }),
    );
  }
}
