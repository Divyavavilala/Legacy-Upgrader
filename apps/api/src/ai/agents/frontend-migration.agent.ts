import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { AiCacheService } from '../services/ai-cache.service';
import { AiRateLimiterService } from '../services/ai-rate-limiter.service';
import { AiTokenAccountingService } from '../services/ai-token-accounting.service';
import { RepositoryContextEngineService } from '../services/repository-context-engine.service';
import { FRONTEND_MODERNIZATION_PROMPT } from '../prompts';
import { BaseAiAgent } from './base-ai.agent';

@Injectable()
export class FrontendMigrationAgent extends BaseAiAgent {
  readonly focusLabel = 'Frontend migration (React, TypeScript, legacy UI)';

  protected readonly systemPrompt = FRONTEND_MODERNIZATION_PROMPT.system;

  constructor(
    providerRegistry: AiProviderRegistry,
    contextEngine: RepositoryContextEngineService,
    tokenAccounting: AiTokenAccountingService,
    cache: AiCacheService,
    rateLimiter: AiRateLimiterService,
    config: ConfigService<EnvConfig, true>,
  ) {
    super(
      'frontend-migration',
      providerRegistry,
      contextEngine,
      tokenAccounting,
      cache,
      rateLimiter,
      config.get('AI_CACHE_TTL_SECONDS', { infer: true }),
      config.get('AI_MAX_TOKENS_PER_REQUEST', { infer: true }),
    );
  }
}
