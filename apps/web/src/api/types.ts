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

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
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
  organization?: OrganizationDetail;
  memberships?: Array<{
    id: string;
    role: UserRole;
    organization: OrganizationSummary;
  }>;
}

export interface OrganizationDetail extends OrganizationSummary {
  settings?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  subscription?: {
    status: string;
    plan: {
      tier: string;
      name: string;
      maxRepositories: number;
      maxScansPerMonth: number;
      maxAiTokensPerMonth: number;
    };
  };
  _count?: { members: number; repositories: number };
}

export interface OrganizationMember {
  id: string;
  role: UserRole;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
  };
}

export interface Entitlements {
  plan: { tier: string; name: string };
  limits: {
    maxRepositories: number;
    maxScansPerMonth: number;
    maxAiTokensPerMonth: number;
    maxMembers: number;
    reportRetentionDays: number;
    maxApiKeys: number;
  };
  usage: {
    repositories: number;
    scans: number;
    aiTokens: number;
    workerJobs: number;
    storageBytes: string;
  };
  remaining: {
    repositories: number;
    scans: number;
    aiTokens: number;
  };
}

export interface AuditLogEntry {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  createdAt: string;
  user?: { id: string; email: string; name: string | null } | null;
}

export interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export type ApiKeyScope =
  | 'READ_REPOSITORIES'
  | 'WRITE_REPOSITORIES'
  | 'TRIGGER_SCANS'
  | 'READ_SCANS'
  | 'READ_USAGE'
  | 'MANAGE_SETTINGS';

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
