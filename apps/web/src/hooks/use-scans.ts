import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/sdk';
import type { ScanStatus } from '@/api/types';

export const scanKeys = {
  detail: (id: string) => ['scans', id] as const,
  progress: (id: string) => ['scans', id, 'progress'] as const,
  aiReport: (id: string) => ['scans', id, 'ai-report'] as const,
};

const ACTIVE: ScanStatus[] = ['PENDING', 'QUEUED', 'RUNNING'];

export function useScan(scanId: string) {
  return useQuery({
    queryKey: scanKeys.detail(scanId),
    queryFn: () => api.scans.get(scanId),
    enabled: Boolean(scanId),
  });
}

export function useScanProgress(scanId: string, status?: ScanStatus) {
  const active = status ? ACTIVE.includes(status) : true;
  return useQuery({
    queryKey: scanKeys.progress(scanId),
    queryFn: () => api.scans.progress(scanId),
    enabled: Boolean(scanId) && active,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      return ACTIVE.includes(data.status) ? 2000 : false;
    },
  });
}

export function useAiReport(scanId: string, enabled = true) {
  return useQuery({
    queryKey: scanKeys.aiReport(scanId),
    queryFn: () => api.scans.aiReport(scanId),
    enabled: Boolean(scanId) && enabled,
    retry: (count, error) => {
      if (error instanceof Error && error.message.includes('not found')) return false;
      return count < 2;
    },
  });
}
