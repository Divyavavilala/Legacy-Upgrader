import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import type { AiCompletionRequest, AiCompletionResponse } from '../types/ai.types';
import { fetchWithTimeout } from '../utils/ai-request.util';
import type { AiProvider } from './ai-provider.interface';

@Injectable()
export class ClaudeProvider implements AiProvider {
  readonly name = 'claude' as const;
  private readonly logger = new Logger(ClaudeProvider.name);
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly requestTimeoutMs: number;

  constructor(config: ConfigService<EnvConfig, true>) {
    this.apiKey = config.get('ANTHROPIC_API_KEY', { infer: true });
    this.model = config.get('ANTHROPIC_MODEL', { infer: true });
    this.requestTimeoutMs = config.get('AI_REQUEST_TIMEOUT_MS', { infer: true });
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key is not configured');
    }

    const response = await fetchWithTimeout(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: request.maxTokens ?? 2048,
          temperature: request.temperature ?? 0.2,
          system: request.systemPrompt,
          messages: [{ role: 'user', content: request.userPrompt }],
        }),
      },
      this.requestTimeoutMs,
    );

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Claude error ${response.status}: ${body}`);
      throw new Error(`Claude request failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      content: Array<{ text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };

    return {
      content: data.content[0]?.text ?? '{}',
      promptTokens: data.usage?.input_tokens ?? 0,
      completionTokens: data.usage?.output_tokens ?? 0,
      model: this.model,
      provider: 'claude',
    };
  }
}
