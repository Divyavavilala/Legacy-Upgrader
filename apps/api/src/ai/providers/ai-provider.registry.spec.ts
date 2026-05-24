import type { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { AiProviderRegistry } from './ai-provider.registry';
import type { AiProvider } from './ai-provider.interface';
import { HeuristicAiProvider } from './heuristic.provider';

function mockProvider(name: AiProvider['name'], configured: boolean): AiProvider {
  return {
    name,
    isConfigured: () => configured,
    complete: jest.fn().mockResolvedValue({
      content: '{"title":"ok","summary":"s","insights":[],"recommendations":[],"risks":[],"confidence":0.9}',
      promptTokens: 1,
      completionTokens: 1,
      model: 'test',
      provider: name,
    }),
  };
}

describe('AiProviderRegistry', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'AI_DEFAULT_PROVIDER') return 'openai';
      if (key === 'AI_FALLBACK_PROVIDER') return 'heuristic';
      if (key === 'AI_PROVIDER_MAX_RETRIES') return 1;
      return undefined;
    }),
  } as unknown as ConfigService<EnvConfig, true>;

  it('falls back to heuristic when no LLM keys are configured', () => {
    const registry = new AiProviderRegistry(
      config,
      mockProvider('openai', false) as never,
      mockProvider('claude', false) as never,
      mockProvider('gemini', false) as never,
      mockProvider('groq', false) as never,
      new HeuristicAiProvider(),
    );

    expect(registry.resolvePrimaryProvider().name).toBe('heuristic');
  });

  it('completeWithFallback uses first configured provider', async () => {
    const openai = mockProvider('openai', true);
    const registry = new AiProviderRegistry(
      config,
      openai as never,
      mockProvider('claude', false) as never,
      mockProvider('gemini', false) as never,
      mockProvider('groq', false) as never,
      new HeuristicAiProvider(),
    );

    const response = await registry.completeWithFallback({
      systemPrompt: 'sys',
      userPrompt: 'user',
      jsonMode: true,
    });

    expect(response.provider).toBe('openai');
    expect(openai.complete).toHaveBeenCalled();
  });
});
