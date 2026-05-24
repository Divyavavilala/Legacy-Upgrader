import path from 'node:path';
import { assertSafeScanId, resolveWithinBase } from './path-safety.util';

describe('path-safety.util', () => {
  it('resolves paths within base directory', () => {
    const base = path.join(path.sep, 'tmp', 'scans');
    expect(resolveWithinBase(base, 'scan123', 'repo')).toBe(
      path.resolve(base, 'scan123', 'repo'),
    );
  });

  it('blocks path traversal', () => {
    const base = path.join(path.sep, 'tmp', 'scans');
    expect(() => resolveWithinBase(base, '..', 'etc', 'passwd')).toThrow(
      /Path traversal blocked/,
    );
  });

  it('validates scan id format', () => {
    expect(() => assertSafeScanId('../bad')).toThrow(/Invalid scan id/);
    expect(() => assertSafeScanId('clxyz123abc')).not.toThrow();
  });
});
