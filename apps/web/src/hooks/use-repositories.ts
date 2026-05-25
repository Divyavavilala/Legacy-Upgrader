import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/api/sdk';
import type { CreateRepositoryInput } from '@/api/types';
import { ApiClientError } from '@/api/client';

export const repositoryKeys = {
  all: ['repositories'] as const,
  detail: (id: string) => ['repositories', id] as const,
  scans: (id: string) => ['repositories', id, 'scans'] as const,
  latestScan: (id: string) => ['repositories', id, 'latest-scan'] as const,
};

export function useRepositories() {
  return useQuery({
    queryKey: repositoryKeys.all,
    queryFn: () => api.repositories.list(),
  });
}

export function useRepository(id: string) {
  return useQuery({
    queryKey: repositoryKeys.detail(id),
    queryFn: () => api.repositories.get(id),
    enabled: Boolean(id),
  });
}

export function useRepositoryScans(repositoryId: string) {
  return useQuery({
    queryKey: repositoryKeys.scans(repositoryId),
    queryFn: () => api.repositories.listScans(repositoryId),
    enabled: Boolean(repositoryId),
  });
}

export function useCreateRepository() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRepositoryInput) => api.repositories.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: repositoryKeys.all });
      toast.success('Repository added');
    },
    onError: (e: Error) => {
      toast.error(e instanceof ApiClientError ? e.message : 'Failed to add repository');
    },
  });
}

export function useTriggerScan(repositoryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.repositories.triggerScan(repositoryId),
    onSuccess: (scan) => {
      void qc.invalidateQueries({ queryKey: repositoryKeys.all });
      void qc.invalidateQueries({ queryKey: repositoryKeys.detail(repositoryId) });
      void qc.invalidateQueries({ queryKey: repositoryKeys.scans(repositoryId) });
      void qc.invalidateQueries({ queryKey: repositoryKeys.latestScan(repositoryId) });
      toast.success('Scan queued', { description: `Scan ${scan.id.slice(0, 8)}… started` });
    },
    onError: (e: Error) => {
      toast.error(e instanceof ApiClientError ? e.message : 'Failed to start scan');
    },
  });
}

export function useDeleteRepository() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.repositories.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: repositoryKeys.all });
      const previous = qc.getQueryData<import('@/api/types').Repository[]>(repositoryKeys.all);
      qc.setQueryData(
        repositoryKeys.all,
        previous?.filter((r) => r.id !== id),
      );
      return { previous };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(repositoryKeys.all, ctx.previous);
      toast.error('Failed to delete repository');
    },
    onSuccess: () => {
      toast.success('Repository deleted');
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: repositoryKeys.all });
    },
  });
}

export function useRepositoryLatestScan(repositoryId: string) {
  return useQuery({
    queryKey: repositoryKeys.latestScan(repositoryId),
    queryFn: () => api.repositories.latestScan(repositoryId),
    enabled: Boolean(repositoryId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && ['PENDING', 'QUEUED', 'RUNNING'].includes(status)) return 2000;
      return false;
    },
  });
}

