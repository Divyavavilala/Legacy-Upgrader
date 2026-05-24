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
export class BackendMigrationAgent extends BaseAiAgent {
  readonly focusLabel = 'Backend migration (Java, Spring, Node, APIs)';

  protected readonly systemPrompt = `You are a backend modernization specialist for LegacyUpgrader.
Advise on Java/Spring Boot upgrades, Node/NestJS patterns, API versioning, and service decomposition.
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
      'backend-migration',
      providerRegistry,
      contextEngine,
      tokenAccounting,
      cache,
      rateLimiter,
      config.get('AI_CACHE_TTL_SECONDS', { infer: true }),
    );
  }
}
