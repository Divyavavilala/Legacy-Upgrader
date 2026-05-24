/** Rough chars-per-token estimate for budgeting (conservative). */
export const CHARS_PER_TOKEN_ESTIMATE = 4;

export interface ContextChunk {
  id: string;
  content: string;
  priority: number;
}

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.pdf',
  '.zip',
  '.gz',
  '.jar',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.mp4',
  '.mp3',
  '.exe',
  '.dll',
  '.so',
  '.bin',
  '.lock',
]);

export function isBinaryOrIgnoredPath(relativePath: string): boolean {
  const lower = relativePath.toLowerCase();
  if (lower.includes('node_modules/') || lower.includes('.git/')) {
    return true;
  }
  const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.')) : '';
  return BINARY_EXTENSIONS.has(ext);
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

export function truncateToTokenBudget(text: string, maxTokens: number): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN_ESTIMATE;
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}\n\n[truncated for token budget]`;
}

export function chunkSections(
  sections: ContextChunk[],
  maxChars: number,
): string {
  const sorted = [...sections].sort((a, b) => b.priority - a.priority);
  const parts: string[] = [];
  let used = 0;

  for (const section of sorted) {
    const remaining = maxChars - used;
    if (remaining <= 0) {
      break;
    }
    const slice =
      section.content.length > remaining
        ? `${section.content.slice(0, remaining)}\n[section truncated]`
        : section.content;
    parts.push(slice);
    used += slice.length;
  }

  return parts.join('\n\n');
}
