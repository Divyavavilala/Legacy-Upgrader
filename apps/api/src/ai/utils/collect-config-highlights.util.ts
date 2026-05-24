import path from 'node:path';
import { stat } from 'node:fs/promises';
import {
  findFilesByName,
  readTextFileIfExists,
  toRepoRelativePath,
} from '../../analysis/utils/filesystem.util';
import { isBinaryOrIgnoredPath } from './context-compression.util';
import { CONFIG_FILE_NAMES, scoreRepositoryFile } from './repository-file-prioritizer.util';

const MAX_FILE_BYTES = 48_000;
const MAX_HIGHLIGHT_FILES = 12;
const MAX_EXCERPT_CHARS = 2_000;

export async function collectConfigHighlights(
  repositoryPath: string,
): Promise<Record<string, string>> {
  const highlights: Record<string, string> = {};

  const discovered = await findFilesByName(repositoryPath, CONFIG_FILE_NAMES, 6);
  const scored = discovered
    .map((absolute) => ({
      absolute,
      relative: toRepoRelativePath(repositoryPath, absolute),
      score: scoreRepositoryFile(toRepoRelativePath(repositoryPath, absolute)),
    }))
    .filter((f) => f.score > 0 && !isBinaryOrIgnoredPath(f.relative))
    .sort((a, b) => b.score - a.score);

  for (const file of scored.slice(0, MAX_HIGHLIGHT_FILES)) {
    try {
      const info = await stat(file.absolute);
      if (!info.isFile() || info.size > MAX_FILE_BYTES) {
        continue;
      }
    } catch {
      continue;
    }

    const content = await readTextFileIfExists(file.absolute);
    if (!content) {
      continue;
    }

    highlights[file.relative] = content.slice(0, MAX_EXCERPT_CHARS);
  }

  const workflowDir = path.join(repositoryPath, '.github', 'workflows');
  try {
    const { readdir } = await import('node:fs/promises');
    const entries = await readdir(workflowDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !/\.ya?ml$/i.test(entry.name)) {
        continue;
      }
      const absolute = path.join(workflowDir, entry.name);
      const relative = toRepoRelativePath(repositoryPath, absolute);
      if (Object.keys(highlights).length >= MAX_HIGHLIGHT_FILES) {
        break;
      }
      const content = await readTextFileIfExists(absolute);
      if (content) {
        highlights[relative] = content.slice(0, MAX_EXCERPT_CHARS);
      }
    }
  } catch {
    // No workflows directory
  }

  return highlights;
}
