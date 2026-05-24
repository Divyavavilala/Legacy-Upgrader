import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import type { AiCompletionRequest, AiCompletionResponse } from '../types/ai.types';
import type { AiProvider } from './ai-provider.interface';

@Injectable()
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini' as const;
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly apiKey?: string;
  private readonly model: string;

  constructor(config: ConfigService<EnvConfig, true>) {
    this.apiKey = config.get('GEMINI_API_KEY', { infer: true });
    this.model = config.get('GEMINI_MODEL', { infer: true });
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${request.systemPrompt}\n\n${request.userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: request.temperature ?? 0.2,
          maxOutputTokens: request.maxTokens ?? 2048,
          responseMimeType: request.jsonMode ? 'application/json' : 'text/plain',
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Gemini error ${response.status}: ${body}`);
      throw new Error(`Gemini request failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

    return {
      content: text,
      promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      model: this.model,
      provider: 'gemini',
    };
  }
}
