import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/api/sdk';
import { ApiClientError } from '@/api/client';
import { repositoryKeys } from './use-repositories';

export function useRetryScan(repositoryId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scanId: string) => api.scans.retry(scanId),
    onSuccess: () => {
      if (repositoryId) {
        void qc.invalidateQueries({ queryKey: repositoryKeys.latestScan(repositoryId) });
        void qc.invalidateQueries({ queryKey: repositoryKeys.scans(repositoryId) });
      }
      void qc.invalidateQueries({ queryKey: repositoryKeys.all });
      toast.success('New scan queued');
    },
    onError: (e: Error) =>
      toast.error(e instanceof ApiClientError ? e.message : 'Failed to retry scan'),
  });
}

export function useDownloadReport() {
  return useMutation({
    mutationFn: async ({ scanId, format }: { scanId: string; format: 'md' | 'pdf' | 'zip' }) => {
      if (format === 'md') await api.scans.downloadMarkdown(scanId);
      else if (format === 'pdf') await api.scans.downloadPdf(scanId);
      else await api.scans.downloadZip(scanId);
    },
    onSuccess: (_d, vars) => toast.success(`Downloaded ${vars.format.toUpperCase()} file`),
    onError: () => toast.error('Download failed'),
  });
}
