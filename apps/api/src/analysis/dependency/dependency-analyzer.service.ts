import { Injectable } from '@nestjs/common';
import type { ScanAnalysisContext } from '../types/scan-analysis.types';
import { readTextFileIfExists } from '../utils/filesystem.util';
import { parseGradleBuild } from './parsers/gradle.parser';
import { parseMavenPom } from './parsers/maven.parser';
import { parseMajorVersion, parsePackageJson } from './parsers/package-json.parser';
import { parseRequirementsTxt } from './parsers/requirements.parser';

const DEPRECATED_NPM_PACKAGES = new Set([
  'request',
  'gulp-util',
  'mkdirp',
  'node-uuid',
  'har-validator',
]);

const RISKY_NPM_PACKAGES: Record<string, { minSafe: string; major: number }> = {
  lodash: { minSafe: '4.17.21', major: 4 },
};

@Injectable()
export class DependencyAnalyzer {
  async analyze(context: ScanAnalysisContext): Promise<void> {
    for (const pkg of context.packageJsonFiles) {
      this.analyzeNodePackage(context, pkg);
    }

    await this.analyzeJava(context);
    await this.analyzePython(context);
  }

  private analyzeNodePackage(
    context: ScanAnalysisContext,
    pkg: ReturnType<typeof parsePackageJson>,
  ): void {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (!allDeps.typescript && context.technologies.includes('nodejs')) {
      context.findings.push({
        severity: 'LOW',
        category: 'CODE_QUALITY',
        title: 'TypeScript not configured',
        description: `No typescript dependency found in ${pkg.filePath}. Consider adopting TypeScript for safer refactors.`,
        filePath: pkg.filePath,
        ruleId: 'deps.missing-typescript',
        fingerprint: `${pkg.filePath}:missing-typescript`,
      });
    }

    if (!allDeps.eslint && !allDeps['@biomejs/biome']) {
      context.findings.push({
        severity: 'LOW',
        category: 'CODE_QUALITY',
        title: 'No ESLint or Biome detected',
        description: `Add linting tooling to ${pkg.filePath} to catch issues during modernization.`,
        filePath: pkg.filePath,
        ruleId: 'deps.missing-linter',
        fingerprint: `${pkg.filePath}:missing-linter`,
      });
    }

    if (!allDeps.jest && !allDeps.vitest && !allDeps.mocha) {
      context.findings.push({
        severity: 'MEDIUM',
        category: 'CODE_QUALITY',
        title: 'No JavaScript test runner detected',
        description: `package.json at ${pkg.filePath} has no jest, vitest, or mocha dependency.`,
        filePath: pkg.filePath,
        ruleId: 'deps.missing-test-runner',
        fingerprint: `${pkg.filePath}:missing-test-runner`,
      });
    }

    for (const [name, version] of Object.entries(pkg.dependencies)) {
      if (DEPRECATED_NPM_PACKAGES.has(name)) {
        context.findings.push({
          severity: 'HIGH',
          category: 'DEPENDENCY',
          title: `Deprecated dependency: ${name}`,
          description: `${name}@${version} is deprecated and should be replaced.`,
          filePath: pkg.filePath,
          ruleId: 'deps.deprecated',
          fingerprint: `${pkg.filePath}:deprecated:${name}`,
          metadata: { package: name, version },
        });
      }

      if (name === 'react') {
        const major = parseMajorVersion(version);
        if (major !== null && major < 18) {
          context.findings.push({
            severity: 'HIGH',
            category: 'DEPENDENCY',
            title: 'Outdated React version',
            description: `React ${version} detected. React 18+ is recommended for concurrent features and long-term support.`,
            filePath: pkg.filePath,
            ruleId: 'deps.react-outdated',
            fingerprint: `${pkg.filePath}:react-outdated`,
            metadata: { current: version, recommended: '^18.0.0' },
          });

          context.dependencyIssues.push({
            packageName: 'react',
            currentVersion: version,
            recommendedVersion: '^18.0.0',
            severity: 'HIGH',
            ecosystem: 'npm',
            isDirect: true,
          });
        }
      }

      if (name === 'jquery') {
        context.findings.push({
          severity: 'MEDIUM',
          category: 'CODE_QUALITY',
          title: 'Legacy jQuery dependency',
          description: `jQuery ${version} is declared in ${pkg.filePath}. Prefer modern component frameworks.`,
          filePath: pkg.filePath,
          ruleId: 'deps.jquery',
          fingerprint: `${pkg.filePath}:jquery`,
        });
      }

      const risky = RISKY_NPM_PACKAGES[name];
      if (risky) {
        const major = parseMajorVersion(version);
        if (major !== null && major <= risky.major && version < risky.minSafe) {
          context.findings.push({
            severity: 'CRITICAL',
            category: 'SECURITY',
            title: `Vulnerable dependency: ${name}`,
            description: `${name}@${version} has known CVEs. Upgrade to ${risky.minSafe} or later.`,
            filePath: pkg.filePath,
            ruleId: 'deps.vulnerable',
            fingerprint: `${pkg.filePath}:vulnerable:${name}`,
          });

          context.dependencyIssues.push({
            packageName: name,
            currentVersion: version,
            recommendedVersion: risky.minSafe,
            severity: 'CRITICAL',
            ecosystem: 'npm',
            isDirect: true,
            cveIds: [],
          });
        }
      }
    }
  }

  private async analyzeJava(context: ScanAnalysisContext): Promise<void> {
    const pomPath = `${context.repositoryPath}/pom.xml`;
    const pomContent = await readTextFileIfExists(pomPath);
    if (pomContent) {
      const maven = parseMavenPom(pomContent);
      context.metadata.maven = maven;

      if (maven.javaVersion) {
        const major = parseMajorVersion(maven.javaVersion);
        if (major !== null && major < 17) {
          context.findings.push({
            severity: 'HIGH',
            category: 'DEPENDENCY',
            title: 'Outdated Java version',
            description: `Java ${maven.javaVersion} detected in pom.xml. JDK 17+ is recommended for Spring Boot 3.x.`,
            filePath: 'pom.xml',
            ruleId: 'deps.java-outdated',
            fingerprint: 'pom.xml:java-outdated',
          });
        }
      }

      if (maven.springBootVersion) {
        const major = parseMajorVersion(maven.springBootVersion);
        if (major !== null && major < 3) {
          context.findings.push({
            severity: 'HIGH',
            category: 'DEPENDENCY',
            title: 'Outdated Spring Boot version',
            description: `Spring Boot ${maven.springBootVersion} detected. Spring Boot 3.x requires Java 17+.`,
            filePath: 'pom.xml',
            ruleId: 'deps.spring-boot-outdated',
            fingerprint: 'pom.xml:spring-boot-outdated',
          });
        }
      }
    }

    const gradlePath = `${context.repositoryPath}/build.gradle`;
    const gradleKtsPath = `${context.repositoryPath}/build.gradle.kts`;
    const gradleContent =
      (await readTextFileIfExists(gradlePath)) ??
      (await readTextFileIfExists(gradleKtsPath));

    if (gradleContent) {
      const gradle = parseGradleBuild(gradleContent);
      context.metadata.gradle = gradle;

      if (gradle.springBootVersion) {
        const major = parseMajorVersion(gradle.springBootVersion);
        if (major !== null && major < 3) {
          context.findings.push({
            severity: 'HIGH',
            category: 'DEPENDENCY',
            title: 'Outdated Spring Boot version (Gradle)',
            description: `Spring Boot ${gradle.springBootVersion} detected in Gradle build file.`,
            filePath: 'build.gradle',
            ruleId: 'deps.spring-boot-outdated-gradle',
            fingerprint: 'gradle:spring-boot-outdated',
          });
        }
      }
    }
  }

  private async analyzePython(context: ScanAnalysisContext): Promise<void> {
    const reqPath = `${context.repositoryPath}/requirements.txt`;
    const content = await readTextFileIfExists(reqPath);
    if (!content) return;

    const requirements = parseRequirementsTxt(content);
    context.metadata.pythonRequirements = requirements;

    for (const req of requirements) {
      if (req.name === 'django') {
        const major = req.version ? parseMajorVersion(req.version) : null;
        if (major !== null && major < 4) {
          context.findings.push({
            severity: 'MEDIUM',
            category: 'DEPENDENCY',
            title: 'Outdated Django version',
            description: `Django ${req.version} in requirements.txt. Django 4+ recommended.`,
            filePath: 'requirements.txt',
            ruleId: 'deps.django-outdated',
            fingerprint: 'requirements.txt:django-outdated',
          });
        }
      }
    }
  }
}
