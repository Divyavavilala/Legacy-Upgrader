import { RepositoryProvider } from '@prisma/client';
import { detectRepositoryProvider } from './detect-repository-provider';

export interface ParsedGitUrl {
  normalizedUrl: string;
  slug: string;
  name: string;
  defaultBranch: string;
  provider: RepositoryProvider;
}

function toKebabSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function extractRepoPath(gitUrl: string): string | null {
  const trimmed = gitUrl.trim().replace(/\.git$/i, '');

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length >= 2) {
      return segments.slice(-2).join('/');
    }
    if (segments.length === 1) {
      return segments[0] ?? null;
    }
  } catch {
    const sshMatch = trimmed.match(/[:@][^:]+[:/](.+)$/);
    if (sshMatch?.[1]) {
      return sshMatch[1];
    }
  }

  return null;
}

export function parseGitUrl(gitUrl: string, displayName?: string): ParsedGitUrl {
  const trimmed = gitUrl.trim();
  const normalizedUrl = trimmed.endsWith('.git') ? trimmed : `${trimmed.replace(/\/$/, '')}.git`;
  const provider = detectRepositoryProvider(trimmed);
  const repoPath = extractRepoPath(trimmed);

  const repoSegment = repoPath?.split('/').pop() ?? 'repository';
  const derivedName = repoSegment.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const name = displayName?.trim() || derivedName;
  const slug = toKebabSlug(repoSegment) || 'repository';

  return {
    normalizedUrl: normalizedUrl.replace(/\.git\.git$/i, '.git'),
    slug,
    name,
    defaultBranch: 'main',
    provider,
  };
}
