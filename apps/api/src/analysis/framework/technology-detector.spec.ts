import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { detectTechnologies } from './technology-detector';

describe('technology-detector', () => {
  it('detects Node.js stack from package.json', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'lu-tech-'));
    await writeFile(
      path.join(root, 'package.json'),
      JSON.stringify({
        dependencies: { react: '^18.0.0', express: '^4.18.0' },
        devDependencies: { typescript: '^5.0.0' },
      }),
    );

    const technologies = await detectTechnologies({
      repositoryPath: root,
      packageJsonFiles: [
        {
          filePath: 'package.json',
          dependencies: { react: '^18.0.0', express: '^4.18.0' },
          devDependencies: { typescript: '^5.0.0' },
        },
      ],
    });

    expect(technologies).toEqual(
      expect.arrayContaining(['react', 'nodejs', 'express', 'typescript']),
    );
  });

  it('detects Java/Maven from pom.xml', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'lu-tech-'));
    await mkdir(path.join(root, 'src'), { recursive: true });
    await writeFile(
      path.join(root, 'pom.xml'),
      `<project><parent><artifactId>spring-boot-starter-parent</artifactId></parent></project>`,
    );

    const technologies = await detectTechnologies({
      repositoryPath: root,
      packageJsonFiles: [],
    });

    expect(technologies).toEqual(expect.arrayContaining(['java', 'maven', 'spring-boot']));
  });
});
