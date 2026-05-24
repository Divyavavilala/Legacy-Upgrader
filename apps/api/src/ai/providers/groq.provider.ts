import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import type { AiCompletionRequest, AiCompletionResponse } from '../types/ai.types';
import { fetchWithTimeout } from '../utils/ai-request.util';
import type { AiProvider } from './ai-provider.interface';

/** Groq exposes an OpenAI-compatible chat completions API. */
@Injectable()
export class GroqProvider implements AiProvider {
  readonly name = 'groq' as const;
  private readonly logger = new Logger(GroqProvider.name);
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly requestTimeoutMs: number;

  constructor(config: ConfigService<EnvConfig, true>) {
    this.apiKey = config.get('GROQ_API_KEY', { infer: true });
    this.model = config.get('GROQ_MODEL', { infer: true });
    this.requestTimeoutMs = config.get('AI_REQUEST_TIMEOUT_MS', { infer: true });
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    if (!this.apiKey) {
      throw new Error('Groq API key is not configured');
    }

    const response = await fetchWithTimeout(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          temperature: request.temperature ?? 0.2,
          max_tokens: request.maxTokens ?? 2048,
          response_format: request.jsonMode ? { type: 'json_object' } : undefined,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
          ],
        }),
      },
      this.requestTimeoutMs,
    );

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Groq error ${response.status}: ${body}`);
      throw new Error(`Groq request failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? '{}',
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      model: this.model,
      provider: 'groq',
    };
  }
}
