import {
  chunkSections,
  estimateTokens,
  isBinaryOrIgnoredPath,
  truncateToTokenBudget,
} from './context-compression.util';

describe('context-compression.util', () => {
  it('detects binary and ignored paths', () => {
    expect(isBinaryOrIgnoredPath('assets/logo.png')).toBe(true);
    expect(isBinaryOrIgnoredPath('node_modules/foo/index.js')).toBe(true);
    expect(isBinaryOrIgnoredPath('src/app.ts')).toBe(false);
  });

  it('estimates tokens from character length', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('a'.repeat(40))).toBe(10);
  });

  it('truncates to token budget', () => {
    const truncated = truncateToTokenBudget('x'.repeat(100), 5);
    expect(truncated.length).toBeLessThan(100);
    expect(truncated).toContain('[truncated for token budget]');
  });

  it('chunks sections by priority within char budget', () => {
    const result = chunkSections(
      [
        { id: 'low', priority: 1, content: 'low-priority-content-that-should-not-fit' },
        { id: 'high', priority: 100, content: 'HIGH' },
      ],
      12,
    );
    expect(result.startsWith('HIGH')).toBe(true);
    expect(result).not.toContain('low-priority');
  });
});
