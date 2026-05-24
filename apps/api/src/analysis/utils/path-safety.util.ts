import path from 'node:path';

/**
 * Resolves a path and ensures it stays within the allowed base directory.
 * Prevents path traversal (e.g. ../etc/passwd).
 */
export function resolveWithinBase(baseDir: string, ...segments: string[]): string {
  const normalizedBase = path.resolve(baseDir);
  const resolved = path.resolve(normalizedBase, ...segments);

  const relative = path.relative(normalizedBase, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path traversal blocked: ${segments.join('/')}`);
  }

  return resolved;
}

/** Validates scanId is a safe directory name (cuid-style). */
export function assertSafeScanId(scanId: string): void {
  if (!/^[a-z0-9]+$/i.test(scanId)) {
    throw new Error(`Invalid scan id for workspace: ${scanId}`);
  }
}
