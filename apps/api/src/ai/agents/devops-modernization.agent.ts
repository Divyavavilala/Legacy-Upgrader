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
export class DevOpsModernizationAgent extends BaseAiAgent {
  readonly focusLabel = 'DevOps modernization (CI/CD, Docker, Kubernetes)';

  protected readonly systemPrompt = `You are a DevOps modernization advisor for LegacyUpgrader.
Advise on CI/CD pipelines, Dockerization, Kubernetes adoption, and deployment reliability.
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
      'devops-modernization',
      providerRegistry,
      contextEngine,
      tokenAccounting,
      cache,
      rateLimiter,
      config.get('AI_CACHE_TTL_SECONDS', { infer: true }),
    );
  }
}
