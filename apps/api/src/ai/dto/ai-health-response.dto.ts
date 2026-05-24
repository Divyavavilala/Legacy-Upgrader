import type { AiProviderName } from '../types/ai.types';

export interface AiProviderDiagnosticDto {
  name: AiProviderName;
  configured: boolean;
}

export interface AiQueueSummaryDto {
  name: string;
  status: string;
  waiting: number;
  active: number;
  failed: number;
}

export interface AiTokenMetricsDto {
  totalTokens: number;
  estimatedCostUsd: number;
  requests: number;
  cacheHits: number;
  window: '24h' | 'all';
}

export interface AiHealthResponseDto {
  status: 'enabled' | 'disabled';
  autoRunAfterScan: boolean;
  defaultProvider: AiProviderName;
  fallbackProvider: AiProviderName;
  providers: AiProviderDiagnosticDto[];
  ready: boolean;
  mode: 'llm' | 'heuristic-fallback';
  queue: {
    status: string;
    aiQueues: AiQueueSummaryDto[];
  };
  tokenUsage: AiTokenMetricsDto;
  checkedAt: string;
}
