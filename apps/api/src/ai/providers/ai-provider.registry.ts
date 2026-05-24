import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import type { AiCompletionRequest, AiCompletionResponse, AiProviderName } from '../types/ai.types';
import type { AiProvider } from './ai-provider.interface';
import { ClaudeProvider } from './claude.provider';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';
import { HeuristicAiProvider } from './heuristic.provider';
import { OpenAiProvider } from './openai.provider';

@Injectable()
export class AiProviderRegistry {
  private readonly logger = new Logger(AiProviderRegistry.name);
  private readonly providers = new Map<AiProviderName, AiProvider>();
  private readonly defaultProvider: AiProviderName;
  private readonly fallbackProvider: AiProviderName;

  constructor(
    config: ConfigService<EnvConfig, true>,
    openai: OpenAiProvider,
    claude: ClaudeProvider,
    gemini: GeminiProvider,
    groq: GroqProvider,
    heuristic: HeuristicAiProvider,
  ) {
    this.providers.set('openai', openai);
    this.providers.set('claude', claude);
    this.providers.set('gemini', gemini);
    this.providers.set('groq', groq);
    this.providers.set('heuristic', heuristic);

    this.defaultProvider = config.get('AI_DEFAULT_PROVIDER', { infer: true });
    this.fallbackProvider = config.get('AI_FALLBACK_PROVIDER', { infer: true });
  }

  getProvider(name: AiProviderName): AiProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Unknown AI provider: ${name}`);
    }
    return provider;
  }

  resolvePrimaryProvider(): AiProvider {
    const primary = this.getProvider(this.defaultProvider);
    if (primary.isConfigured()) {
      return primary;
    }

    for (const name of ['openai', 'claude', 'gemini', 'groq'] as AiProviderName[]) {
      const candidate = this.getProvider(name);
      if (candidate.isConfigured()) {
        this.logger.warn(
          `Default provider "${this.defaultProvider}" unavailable; using "${name}"`,
        );
        return candidate;
      }
    }

    this.logger.warn('No LLM API keys configured; using heuristic provider');
    return this.getProvider('heuristic');
  }

  async completeWithFallback(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const chain = [
      this.defaultProvider,
      ...(['openai', 'claude', 'gemini', 'groq', 'heuristic'] as AiProviderName[]).filter(
        (p) => p !== this.defaultProvider,
      ),
      this.fallbackProvider,
    ];

    const tried = new Set<AiProviderName>();
    let lastError: Error | undefined;

    for (const name of chain) {
      if (tried.has(name)) continue;
      tried.add(name);

      const provider = this.getProvider(name);
      if (!provider.isConfigured()) continue;

      try {
        return await provider.complete(request);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`Provider ${name} failed: ${lastError.message}`);
      }
    }

    throw lastError ?? new Error('All AI providers failed');
  }

  getDiagnostics(): Array<{ name: AiProviderName; configured: boolean }> {
    return [...this.providers.entries()].map(([name, provider]) => ({
      name,
      configured: provider.isConfigured(),
    }));
  }
}
