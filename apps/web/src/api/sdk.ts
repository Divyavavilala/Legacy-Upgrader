import { apiRequest, clearStoredTokens, persistTokens } from './client';
import type {
  AiReportResponse,
  AuthTokens,
  CreateRepositoryInput,
  LoginInput,
  RegisterInput,
  Repository,
  ScanDetail,
  ScanProgress,
  ScanSummary,
  UserProfile,
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
    persistSession: persistTokens,
    clearSession: clearStoredTokens,
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
  },

  scans: {
    get: (id: string) => apiRequest<ScanDetail>(`/scans/${id}`),
    progress: (id: string) => apiRequest<ScanProgress>(`/scans/${id}/progress`),
    aiReport: (id: string) => apiRequest<AiReportResponse>(`/scans/${id}/ai-report`),
  },

  health: () => apiRequest<{ status: string }>('/health', { skipAuth: true }),
};
