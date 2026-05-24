/** Base fields shared across organization-scoped jobs. */
export interface OrganizationScopedJobPayload {
  organizationId: string;
  requestedByUserId?: string;
}

export interface RepositoryScanJobPayload extends OrganizationScopedJobPayload {
  scanId: string;
  repositoryId: string;
  branch?: string;
  commitSha?: string;
}

export interface DependencyAnalysisJobPayload extends OrganizationScopedJobPayload {
  scanId: string;
  repositoryId: string;
}

export interface AiModernizationJobPayload extends OrganizationScopedJobPayload {
  scanId: string;
  repositoryId: string;
  reportId?: string;
}

export interface ReportGenerationJobPayload extends OrganizationScopedJobPayload {
  scanId: string;
  repositoryId: string;
  reportId: string;
  reportType: 'modernization' | 'dependency' | 'executive-summary';
}

export type QueueJobPayloadMap = {
  'repository-scan': RepositoryScanJobPayload;
  'dependency-analysis': DependencyAnalysisJobPayload;
  'ai-modernization': AiModernizationJobPayload;
  'report-generation': ReportGenerationJobPayload;
};
