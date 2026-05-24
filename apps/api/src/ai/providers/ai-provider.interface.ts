import type { AiCompletionRequest, AiCompletionResponse, AiProviderName } from '../types/ai.types';

export interface AiProvider {
  readonly name: AiProviderName;
  isConfigured(): boolean;
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
}
