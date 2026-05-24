export type AiProviderName = 'openai' | 'claude' | 'gemini' | 'groq' | 'heuristic';

export type AiAgentType =
  | 'dependency-modernization'
  | 'architecture-review'
  | 'security-review'
  | 'frontend-migration'
  | 'backend-migration'
  | 'devops-modernization';

export interface AiCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

export interface AiCompletionResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
  provider: AiProviderName;
  cached?: boolean;
}

export interface AgentInsightPayload {
  title: string;
  summary: string;
  insights: string[];
  recommendations: Array<{
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    effort: 'TRIVIAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
    targetStack?: string;
  }>;
  risks: string[];
  confidence: number;
}

export interface ModernizationReportContent {
  executiveSummary: string;
  modernizationRoadmap: Array<{
    phase: number;
    title: string;
    description: string;
    durationWeeks?: number;
  }>;
  technicalDebtSummary: string;
  migrationPriorities: string[];
  securityRisks: string[];
  scalabilityConcerns: string[];
  maintainabilityAssessment: string;
  agentSummaries: Record<string, string>;
  generatedAt: string;
  provider: AiProviderName;
  model: string;
}

export type { RepositoryAnalysisSnapshot } from '../../analysis/types/repository-snapshot.types';
