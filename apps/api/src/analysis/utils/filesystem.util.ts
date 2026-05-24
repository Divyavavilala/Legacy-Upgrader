import { readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { resolveWithinBase } from './path-safety.util';

const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  'target',
  'vendor',
  '__pycache__',
  '.turbo',
]);

export async function safeRemoveDirectory(dirPath: string): Promise<void> {
  try {
    await rm(dirPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  } catch {
    // Best-effort cleanup; workspace manager logs failures
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const info = await stat(filePath);
    return info.isFile();
  } catch {
    return false;
  }
}

export async function readTextFileIfExists(filePath: string): Promise<string | null> {
  if (!(await fileExists(filePath))) {
    return null;
  }
  return readFile(filePath, 'utf8');
}

export async function findFilesByName(
  rootDir: string,
  fileNames: Set<string>,
  maxDepth = 8,
): Promise<string[]> {
  const matches: string[] = [];

  async function walk(current: string, depth: number): Promise<void> {
    if (depth > maxDepth) {
      return;
    }

    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          await walk(fullPath, depth + 1);
        }
        continue;
      }

      if (entry.isFile() && fileNames.has(entry.name)) {
        matches.push(fullPath);
      }
    }
  }

  await walk(rootDir, 0);
  return matches;
}

export async function countFilesInDirectory(
  rootDir: string,
  maxDepth = 6,
): Promise<number> {
  let count = 0;

  async function walk(current: string, depth: number): Promise<void> {
    if (depth > maxDepth) {
      return;
    }

    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          await walk(path.join(current, entry.name), depth + 1);
        }
      } else if (entry.isFile()) {
        count += 1;
      }
    }
  }

  await walk(rootDir, 0);
  return count;
}

export function toRepoRelativePath(repositoryPath: string, absolutePath: string): string {
  return path.relative(repositoryPath, absolutePath).replace(/\\/g, '/');
}

export function safeRepoPath(repositoryPath: string, relativePath: string): string {
  return resolveWithinBase(repositoryPath, relativePath);
}
