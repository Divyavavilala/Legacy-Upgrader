export type UserRole = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER';

export type ScanStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type FindingSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type FindingCategory =
  | 'SECURITY'
  | 'DEPENDENCY'
  | 'CODE_QUALITY'
  | 'ARCHITECTURE'
  | 'LICENSING'
  | 'PERFORMANCE'
  | 'OTHER';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: { timestamp: string; path: string };
}

export interface ApiError {
  success: false;
  error: {
    statusCode: number;
    message: string;
    details?: unknown;
    path: string;
    timestamp: string;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  organizationId: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Repository {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  url: string | null;
  provider: string;
  defaultBranch: string | null;
  isActive: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { scans: number };
  scans?: Array<{
    id: string;
    status: ScanStatus;
    progress: number;
    createdAt: string;
    completedAt: string | null;
  }>;
}

export interface ScanSummary {
  id: string;
  repositoryId: string;
  status: ScanStatus;
  progress: number;
  currentStage: string | null;
  branch: string | null;
  commitSha: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { findings: number };
}

export interface Finding {
  id: string;
  scanId: string;
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  description: string | null;
  filePath: string | null;
  ruleId: string | null;
  createdAt: string;
}

export interface ScanDetail extends ScanSummary {
  findings: Finding[];
  repository: { id: string; name: string; slug: string; organizationId: string };
  _count: { findings: number; dependencyIssues: number };
  metadata?: Record<string, unknown> | null;
  errorMessage?: string | null;
}

export interface ScanProgress {
  status: ScanStatus;
  progress: number;
  currentStage: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AiInsight {
  id: string;
  scanId: string;
  agentType: string;
  title: string;
  summary: string | null;
  content: Record<string, unknown>;
  confidence: number | null;
  createdAt: string;
}

export interface ModernizationReport {
  id: string;
  scanId: string;
  status: string;
  title: string | null;
  summary: string | null;
  content: Record<string, unknown> | null;
  publishedAt: string | null;
}

export interface AiReportResponse {
  report: ModernizationReport;
  insights: AiInsight[];
  tokenUsage: Array<{
    id: string;
    provider: string;
    model: string;
    totalTokens: number;
    estimatedCostUsd: string | null;
    cacheHit: boolean;
  }>;
}

export interface CreateRepositoryInput {
  name: string;
  slug: string;
  gitUrl: string;
  defaultBranch?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  organizationName: string;
  organizationSlug: string;
}
