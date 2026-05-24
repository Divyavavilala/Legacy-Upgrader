import type { ParsedPackageJson } from '../../types/scan-analysis.types';

export function parsePackageJson(content: string, filePath: string): ParsedPackageJson {
  const parsed = JSON.parse(content) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    engines?: Record<string, string>;
  };

  return {
    filePath,
    dependencies: parsed.dependencies ?? {},
    devDependencies: parsed.devDependencies ?? {},
    engines: parsed.engines,
  };
}

export function parseMajorVersion(versionRange: string): number | null {
  const cleaned = versionRange.trim().replace(/^[\^~>=<]+/, '');
  const match = cleaned.match(/(\d+)/);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}
