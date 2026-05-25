import { apiDownload, apiRequest, clearStoredTokens, persistTokens } from './client';
import type {
  AiReportResponse,
  ApiKeyScope,
  ApiKeySummary,
  AuditLogEntry,
  AuthTokens,
  CreateRepositoryInput,
  Entitlements,
  LoginInput,
  OrganizationDetail,
  OrganizationMember,
  RegisterInput,
  Repository,
  ScanDetail,
  ScanProgress,
  ScanSummary,
  UserProfile,
  UserRole,
} from './types';

export const api = {
  auth: {
    login: (input: LoginInput) =>
      apiRequest<AuthTokens>('/auth/login', { method: 'POST', body: input, skipAuth: true }),
    register: (input: RegisterInput) =>
      apiRequest<AuthTokens>('/auth/register', { method: 'POST', body: input, skipAuth: true }),
    refresh: (refreshToken: string) =>
      apiRequest<AuthTokens>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
        skipAuth: true,
      }),
    logout: async (refreshToken: string) => {
      await apiRequest<void>('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
        skipAuth: true,
      });
      clearStoredTokens();
    },
    me: () => apiRequest<UserProfile>('/auth/me'),
    switchOrganization: (organizationId: string) =>
      apiRequest<AuthTokens & { organization: { id: string; name: string; slug: string }; role: UserRole }>(
        '/auth/switch-organization',
        { method: 'POST', body: { organizationId } },
      ),
    persistSession: persistTokens,
    clearSession: clearStoredTokens,
  },

  organizations: {
    current: () => apiRequest<OrganizationDetail>('/organizations/current'),
    update: (body: { name?: string; slug?: string; settings?: Record<string, unknown> }) =>
      apiRequest<OrganizationDetail>('/organizations/current', { method: 'PATCH', body }),
    listMine: () =>
      apiRequest<Array<{ id: string; role: UserRole; organization: { id: string; name: string; slug: string } }>>(
        '/organizations/mine',
      ),
  },

  members: {
    list: () => apiRequest<OrganizationMember[]>('/members'),
    listInvitations: () =>
      apiRequest<
        Array<{
          id: string;
          email: string;
          role: UserRole;
          status: string;
          expiresAt: string;
          invitedBy: { id: string; email: string; name: string | null };
        }>
      >('/members/invitations'),
    invite: (body: { email: string; role: UserRole }) =>
      apiRequest<{ invitationId: string; acceptToken: string; email: string; role: UserRole }>(
        '/members/invite',
        { method: 'POST', body },
      ),
    updateRole: (userId: string, body: { role: UserRole }) =>
      apiRequest<void>(`/members/${userId}/role`, { method: 'PATCH', body }),
    remove: (userId: string) => apiRequest<void>(`/members/${userId}`, { method: 'DELETE' }),
  },

  platform: {
    usage: () => apiRequest<Record<string, unknown>>('/platform/usage'),
    entitlements: () => apiRequest<Entitlements>('/platform/entitlements'),
  },

  apiKeys: {
    list: () => apiRequest<ApiKeySummary[]>('/api-keys'),
    create: (body: { name: string; scopes: ApiKeyScope[]; expiresInDays?: number }) =>
      apiRequest<ApiKeySummary & { rawKey: string }>('/api-keys', { method: 'POST', body }),
    revoke: (id: string) => apiRequest<void>(`/api-keys/${id}`, { method: 'DELETE' }),
  },

  audit: {
    search: (params: { search?: string; page?: number; pageSize?: number }) => {
      const q = new URLSearchParams();
      if (params.search) q.set('search', params.search);
      if (params.page) q.set('page', String(params.page));
      if (params.pageSize) q.set('pageSize', String(params.pageSize));
      const qs = q.toString();
      return apiRequest<{ items: AuditLogEntry[]; total: number }>(
        `/audit-logs${qs ? `?${qs}` : ''}`,
      );
    },
  },

  notifications: {
    list: (unreadOnly?: boolean) =>
      apiRequest<Array<{ id: string; title: string; body: string | null; readAt: string | null; createdAt: string }>>(
        `/notifications${unreadOnly ? '?unreadOnly=true' : ''}`,
      ),
    markRead: (id: string) =>
      apiRequest<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),
  },

  repositories: {
    list: () => apiRequest<Repository[]>('/repositories'),
    get: (id: string) => apiRequest<Repository>(`/repositories/${id}`),
    create: (input: CreateRepositoryInput) =>
      apiRequest<Repository>('/repositories', { method: 'POST', body: input }),
    remove: (id: string) => apiRequest<void>(`/repositories/${id}`, { method: 'DELETE' }),
    triggerScan: (id: string) =>
      apiRequest<ScanDetail>(`/repositories/${id}/scan`, { method: 'POST' }),
    listScans: (id: string) => apiRequest<ScanSummary[]>(`/repositories/${id}/scans`),
    latestScan: (id: string) => apiRequest<ScanDetail | null>(`/repositories/${id}/latest-scan`),
  },

  scans: {
    get: (id: string) => apiRequest<ScanDetail>(`/scans/${id}`),
    progress: (id: string) => apiRequest<ScanProgress>(`/scans/${id}/progress`),
    aiReport: (id: string) => apiRequest<AiReportResponse>(`/scans/${id}/ai-report`),
    retry: (id: string) => apiRequest<ScanDetail>(`/scans/${id}/retry`, { method: 'POST' }),
    generatedOutput: (id: string) =>
      apiRequest<{ files: import('./types').GeneratedOutputFile[]; count: number }>(
        `/scans/${id}/generated-output`,
      ),
    downloadMarkdown: (id: string) =>
      apiDownload(`/scans/${id}/report/markdown`, `modernization-report-${id.slice(0, 8)}.md`),
    downloadPdf: (id: string) =>
      apiDownload(`/scans/${id}/report/pdf`, `modernization-report-${id.slice(0, 8)}.pdf`),
    downloadZip: (id: string) =>
      apiDownload(`/scans/${id}/output.zip`, `modernized-output-${id.slice(0, 8)}.zip`),
  },

  health: () => apiRequest<{ status: string }>('/health', { skipAuth: true }),
};
