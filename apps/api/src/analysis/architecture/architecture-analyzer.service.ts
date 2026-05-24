import { Injectable, Logger } from '@nestjs/common';
import type { ScanAnalysisContext } from '../types/scan-analysis.types';
import {
  countFilesInDirectory,
  fileExists,
  findFilesByName,
  readTextFileIfExists,
} from '../utils/filesystem.util';

@Injectable()
export class ArchitectureAnalyzer {
  private readonly logger = new Logger(ArchitectureAnalyzer.name);

  async analyze(context: ScanAnalysisContext): Promise<void> {
    const repo = context.repositoryPath;

    await this.checkCiCd(context, repo);
    await this.checkDocker(context, repo);
    await this.checkTests(context, repo);
    await this.checkTypeScriptStrict(context, repo);
    await this.checkMonolith(context, repo);
    await this.checkJqueryUsage(context, repo);
    await this.checkEnvValidation(context, repo);

    this.logger.log(`Architecture analysis produced ${context.findings.length} findings so far`);
  }

  private async checkCiCd(context: ScanAnalysisContext, repo: string): Promise<void> {
    const ciFiles = [
      '.github/workflows',
      '.gitlab-ci.yml',
      'azure-pipelines.yml',
      'Jenkinsfile',
      '.circleci/config.yml',
    ];

    let hasCi = false;
    for (const ciPath of ciFiles) {
      if (await fileExists(`${repo}/${ciPath}`)) {
        hasCi = true;
        break;
      }
    }

    if (!hasCi) {
      context.findings.push({
        severity: 'MEDIUM',
        category: 'ARCHITECTURE',
        title: 'Missing CI/CD pipeline',
        description:
          'No GitHub Actions, GitLab CI, Azure Pipelines, Jenkins, or CircleCI configuration detected.',
        ruleId: 'arch.missing-cicd',
        fingerprint: 'arch.missing-cicd',
      });
    }
  }

  private async checkDocker(context: ScanAnalysisContext, repo: string): Promise<void> {
    const hasDocker =
      (await fileExists(`${repo}/Dockerfile`)) ||
      (await fileExists(`${repo}/docker-compose.yml`)) ||
      (await fileExists(`${repo}/docker-compose.yaml`));

    if (!hasDocker && context.technologies.includes('nodejs')) {
      context.findings.push({
        severity: 'LOW',
        category: 'ARCHITECTURE',
        title: 'No Docker support detected',
        description: 'Add Dockerfile or docker-compose for reproducible builds and deployments.',
        ruleId: 'arch.missing-docker',
        fingerprint: 'arch.missing-docker',
      });
    }
  }

  private async checkTests(context: ScanAnalysisContext, repo: string): Promise<void> {
    const testIndicators = await findFilesByName(
      repo,
      new Set(['jest.config.js', 'jest.config.ts', 'vitest.config.ts', 'pytest.ini']),
      5,
    );

    const testDirs = ['test', 'tests', '__tests__', 'spec'];
    let hasTestDir = false;
    for (const dir of testDirs) {
      if (await fileExists(`${repo}/${dir}`)) {
        hasTestDir = true;
        break;
      }
    }

    if (testIndicators.length === 0 && !hasTestDir) {
      context.findings.push({
        severity: 'MEDIUM',
        category: 'ARCHITECTURE',
        title: 'Missing automated tests',
        description: 'No test directories or test runner configuration files were detected.',
        ruleId: 'arch.missing-tests',
        fingerprint: 'arch.missing-tests',
      });
    }
  }

  private async checkTypeScriptStrict(context: ScanAnalysisContext, repo: string): Promise<void> {
    const tsconfigPaths = await findFilesByName(repo, new Set(['tsconfig.json']), 4);

    for (const tsconfigPath of tsconfigPaths) {
      const content = await readTextFileIfExists(tsconfigPath);
      if (!content) continue;

      try {
        const config = JSON.parse(content) as {
          compilerOptions?: { strict?: boolean };
        };
        if (config.compilerOptions?.strict === false) {
          context.findings.push({
            severity: 'LOW',
            category: 'CODE_QUALITY',
            title: 'Missing TypeScript strict mode',
            description: `${tsconfigPath.replace(repo, '').replace(/^[/\\]/, '')} has strict: false.`,
            filePath: tsconfigPath.replace(repo, '').replace(/^[/\\]/, ''),
            ruleId: 'arch.ts-strict-disabled',
            fingerprint: `ts-strict:${tsconfigPath}`,
          });
        }
      } catch {
        // ignore invalid json
      }
    }
  }

  private async checkMonolith(context: ScanAnalysisContext, repo: string): Promise<void> {
    const fileCount = await countFilesInDirectory(repo, 5);
    const srcDirs = ['src', 'app', 'lib', 'packages'];

    let largeModules = 0;
    for (const dir of srcDirs) {
      const dirPath = `${repo}/${dir}`;
      if (await fileExists(dirPath)) {
        const count = await countFilesInDirectory(dirPath, 4);
        if (count > 150) {
          largeModules += 1;
        }
      }
    }

    if (fileCount > 300 || largeModules >= 2) {
      context.findings.push({
        severity: 'HIGH',
        category: 'ARCHITECTURE',
        title: 'Monolithic architecture warning',
        description: `Repository contains ${fileCount}+ tracked files with large cohesive modules. Consider modularization before incremental upgrades.`,
        ruleId: 'arch.monolithic',
        fingerprint: 'arch.monolithic',
        metadata: { fileCount, largeModules },
      });
    }
  }

  private async checkJqueryUsage(context: ScanAnalysisContext, repo: string): Promise<void> {
    const jsFiles = await findFilesByName(repo, new Set(['jquery.js', 'jquery.min.js']), 6);
    const hasJqueryInPackage = context.packageJsonFiles.some(
      (p) => p.dependencies.jquery || p.devDependencies.jquery,
    );

    if (jsFiles.length > 0 || hasJqueryInPackage) {
      context.findings.push({
        severity: 'MEDIUM',
        category: 'CODE_QUALITY',
        title: 'Legacy jQuery usage detected',
        description:
          'jQuery assets or dependencies were found. Consider migrating to a modern component framework.',
        ruleId: 'arch.jquery-usage',
        fingerprint: 'arch.jquery-usage',
      });
    }
  }

  private async checkEnvValidation(context: ScanAnalysisContext, repo: string): Promise<void> {
    const isNest =
      context.technologies.includes('nestjs') ||
      context.packageJsonFiles.some((p) => p.dependencies['@nestjs/core']);

    if (!isNest) return;

    const envValidationPaths = [
      'src/config/env.validation.ts',
      'src/env.validation.ts',
      'apps/api/src/config/env.validation.ts',
    ];
    const hasEnvValidation = (
      await Promise.all(envValidationPaths.map((p) => fileExists(`${repo}/${p}`)))
    ).some(Boolean);

    if (!hasEnvValidation) {
      context.findings.push({
        severity: 'LOW',
        category: 'ARCHITECTURE',
        title: 'Missing environment validation module',
        description:
          'NestJS project without env.validation.ts-style config guard. Add validated configuration for production safety.',
        ruleId: 'arch.missing-env-validation',
        fingerprint: 'arch.missing-env-validation',
      });
    }
  }

}
