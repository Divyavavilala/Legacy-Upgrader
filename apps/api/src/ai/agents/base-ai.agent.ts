import { Logger } from '@nestjs/common';
import type { AiProviderRegistry } from '../providers/ai-provider.registry';
import type { AiCacheService } from '../services/ai-cache.service';
import type { AiRateLimiterService } from '../services/ai-rate-limiter.service';
import type { AiTokenAccountingService } from '../services/ai-token-accounting.service';
import type { RepositoryContextEngineService } from '../services/repository-context-engine.service';
import type {
  AgentInsightPayload,
  AiAgentType,
} from '../types/ai.types';
import type { RepositoryAnalysisSnapshot } from '../../analysis/types/repository-snapshot.types';

export interface AgentRunContext {
  scanId: string;
  organizationId: string;
  repositoryId: string;
  snapshot: RepositoryAnalysisSnapshot;
}

export abstract class BaseAiAgent {
  protected readonly logger: Logger;
  readonly agentType: AiAgentType;

  constructor(
    agentType: AiAgentType,
    protected readonly providerRegistry: AiProviderRegistry,
    protected readonly contextEngine: RepositoryContextEngineService,
    protected readonly tokenAccounting: AiTokenAccountingService,
    protected readonly cache: AiCacheService,
    protected readonly rateLimiter: AiRateLimiterService,
    protected readonly cacheTtlSeconds: number,
  ) {
    this.agentType = agentType;
    this.logger = new Logger(this.constructor.name);
  }

  abstract get focusLabel(): string;

  protected abstract get systemPrompt(): string;

  async run(ctx: AgentRunContext): Promise<AgentInsightPayload> {
    await this.rateLimiter.acquire(ctx.organizationId);

    const contextDoc = this.contextEngine.buildContextDocument(ctx.snapshot, this.focusLabel);
    const userPrompt = `${contextDoc}\n\nRespond with JSON matching: { title, summary, insights[], recommendations[{title,description,priority,effort,targetStack?}], risks[], confidence }`;

    const requestHash = this.cache.buildRequestHash(`${this.agentType}:${userPrompt}`);
    const cached = await this.cache.get(requestHash);
    if (cached) {
      const parsed = this.parseInsight(cached);
      await this.tokenAccounting.recordUsage({
        organizationId: ctx.organizationId,
        scanId: ctx.scanId,
        agentType: this.agentType,
        response: {
          content: cached,
          promptTokens: 0,
          completionTokens: 0,
          model: 'cache',
          provider: 'heuristic',
          cached: true,
        },
        cacheHit: true,
        requestHash,
      });
      return parsed;
    }

    const response = await this.providerRegistry.completeWithFallback({
      systemPrompt: this.systemPrompt,
      userPrompt,
      jsonMode: true,
      maxTokens: 2048,
      temperature: 0.2,
    });

    await this.tokenAccounting.recordUsage({
      organizationId: ctx.organizationId,
      scanId: ctx.scanId,
      agentType: this.agentType,
      response,
      cacheHit: false,
      requestHash,
    });

    await this.cache.set(requestHash, response.content, this.cacheTtlSeconds);

    return this.parseInsight(response.content);
  }

  protected parseInsight(raw: string): AgentInsightPayload {
    try {
      const jsonStart = raw.indexOf('{');
      const jsonEnd = raw.lastIndexOf('}');
      const slice = jsonStart >= 0 ? raw.slice(jsonStart, jsonEnd + 1) : raw;
      const parsed = JSON.parse(slice) as AgentInsightPayload;
      return {
        title: parsed.title ?? `${this.agentType} insight`,
        summary: parsed.summary ?? '',
        insights: parsed.insights ?? [],
        recommendations: parsed.recommendations ?? [],
        risks: parsed.risks ?? [],
        confidence: parsed.confidence ?? 0.7,
      };
    } catch {
      this.logger.warn(`Failed to parse JSON from agent ${this.agentType}; using fallback shape`);
      return {
        title: `${this.focusLabel} (parsed fallback)`,
        summary: raw.slice(0, 500),
        insights: [raw.slice(0, 300)],
        recommendations: [],
        risks: [],
        confidence: 0.5,
      };
    }
  }
}
