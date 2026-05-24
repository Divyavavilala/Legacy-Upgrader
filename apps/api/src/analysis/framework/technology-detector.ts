import type { DetectedTechnology, ParsedPackageJson } from '../types/scan-analysis.types';
import { fileExists, readTextFileIfExists } from '../utils/filesystem.util';

export interface TechnologyDetectionInput {
  repositoryPath: string;
  packageJsonFiles: ParsedPackageJson[];
}

export async function detectTechnologies(
  input: TechnologyDetectionInput,
): Promise<DetectedTechnology[]> {
  const detected = new Set<DetectedTechnology>();

  for (const pkg of input.packageJsonFiles) {
    applyPackageJsonSignals(detected, pkg);
  }

  await applyConfigFileSignals(detected, input.repositoryPath);

  return [...detected].sort();
}

function applyPackageJsonSignals(
  detected: Set<DetectedTechnology>,
  pkg: ParsedPackageJson,
): void {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (deps.react) detected.add('react');
  if (deps.next) detected.add('nextjs');
  if (deps['@angular/core']) detected.add('angular');
  if (deps.vue) detected.add('vue');
  if (deps.express) detected.add('express');
  if (deps['@nestjs/core']) detected.add('nestjs');
  if (deps.typescript || pkg.devDependencies.typescript) detected.add('typescript');

  if (Object.keys(deps).length > 0 || Object.keys(pkg.devDependencies).length > 0) {
    detected.add('nodejs');
  }
}

async function applyConfigFileSignals(
  detected: Set<DetectedTechnology>,
  repositoryPath: string,
): Promise<void> {
  const checks: Array<{ relativePath: string; tech: DetectedTechnology }> = [
    { relativePath: 'pom.xml', tech: 'maven' },
    { relativePath: 'build.gradle', tech: 'gradle' },
    { relativePath: 'build.gradle.kts', tech: 'gradle' },
    { relativePath: 'requirements.txt', tech: 'python' },
    { relativePath: 'Pipfile', tech: 'python' },
    { relativePath: 'pyproject.toml', tech: 'python' },
    { relativePath: 'Dockerfile', tech: 'docker' },
    { relativePath: 'docker-compose.yml', tech: 'docker' },
    { relativePath: 'docker-compose.yaml', tech: 'docker' },
    { relativePath: 'tsconfig.json', tech: 'typescript' },
  ];

  for (const check of checks) {
    if (await fileExists(`${repositoryPath}/${check.relativePath}`.replace(/\\/g, '/'))) {
      detected.add(check.tech);
    }
  }

  const pomXml = await readTextFileIfExists(`${repositoryPath}/pom.xml`);
  if (pomXml) {
    detected.add('java');
    detected.add('maven');
    if (/spring-boot/i.test(pomXml)) {
      detected.add('spring-boot');
    }
  }

  const gradle = await readTextFileIfExists(`${repositoryPath}/build.gradle`);
  const gradleKts = await readTextFileIfExists(`${repositoryPath}/build.gradle.kts`);
  const gradleContent = gradle ?? gradleKts;
  if (gradleContent) {
    detected.add('java');
    detected.add('gradle');
    if (/spring-boot/i.test(gradleContent)) {
      detected.add('spring-boot');
    }
  }

  const requirements = await readTextFileIfExists(`${repositoryPath}/requirements.txt`);
  if (requirements) {
    detected.add('python');
    if (/django/i.test(requirements)) detected.add('django');
    if (/flask/i.test(requirements)) detected.add('flask');
  }

  const pyproject = await readTextFileIfExists(`${repositoryPath}/pyproject.toml`);
  if (pyproject) {
    detected.add('python');
    if (/django/i.test(pyproject)) detected.add('django');
    if (/flask/i.test(pyproject)) detected.add('flask');
  }

  if (await hasKubernetesManifests(repositoryPath)) {
    detected.add('kubernetes');
  }
}

async function hasKubernetesManifests(repositoryPath: string): Promise<boolean> {
  const k8sDirs = ['k8s', 'kubernetes', 'deploy/k8s', 'manifests'];
  for (const dir of k8sDirs) {
    if (await fileExists(`${repositoryPath}/${dir}`)) {
      return true;
    }
  }
  return false;
}
