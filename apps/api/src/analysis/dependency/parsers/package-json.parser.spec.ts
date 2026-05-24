import { parseMajorVersion, parsePackageJson } from './package-json.parser';

describe('package-json.parser', () => {
  it('parses dependencies and devDependencies', () => {
    const result = parsePackageJson(
      JSON.stringify({
        dependencies: { react: '^16.14.0', lodash: '4.17.15' },
        devDependencies: { typescript: '^5.0.0' },
      }),
      'package.json',
    );

    expect(result.dependencies.react).toBe('^16.14.0');
    expect(result.devDependencies.typescript).toBe('^5.0.0');
  });

  it('extracts major version from ranges', () => {
    expect(parseMajorVersion('^16.14.0')).toBe(16);
    expect(parseMajorVersion('~18.2.0')).toBe(18);
    expect(parseMajorVersion('invalid')).toBeNull();
  });
});
