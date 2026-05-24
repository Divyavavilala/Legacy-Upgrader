import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/api/sdk';
import type { CreateRepositoryInput } from '@/api/types';
import { ApiClientError } from '@/api/client';

export const repositoryKeys = {
  all: ['repositories'] as const,
  detail: (id: string) => ['repositories', id] as const,
  scans: (id: string) => ['repositories', id, 'scans'] as const,
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
      toast.success('Scan queued', { description: `Scan ${scan.id.slice(0, 8)}… started` });
    },
    onError: (e: Error) => {
      toast.error(e instanceof ApiClientError ? e.message : 'Failed to start scan');
    },
  });
}
