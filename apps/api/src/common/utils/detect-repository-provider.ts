import { RepositoryProvider } from '@prisma/client';

export function detectRepositoryProvider(gitUrl: string): RepositoryProvider {
  const normalized = gitUrl.toLowerCase();

  if (normalized.includes('github.com')) {
    return RepositoryProvider.GITHUB;
  }
  if (normalized.includes('gitlab.com') || normalized.includes('gitlab.')) {
    return RepositoryProvider.GITLAB;
  }
  if (normalized.includes('bitbucket.org')) {
    return RepositoryProvider.BITBUCKET;
  }
  if (normalized.includes('dev.azure.com') || normalized.includes('visualstudio.com')) {
    return RepositoryProvider.AZURE_DEVOPS;
  }
  if (normalized.startsWith('file://') || normalized.includes('localhost')) {
    return RepositoryProvider.LOCAL;
  }

  return RepositoryProvider.OTHER;
}
