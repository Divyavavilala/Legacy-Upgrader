import { Injectable, Logger } from '@nestjs/common';
import type { ScanAnalysisContext } from '../types/scan-analysis.types';
import { findFilesByName, readTextFileIfExists, toRepoRelativePath } from '../utils/filesystem.util';
import { parsePackageJson } from '../dependency/parsers/package-json.parser';
import { detectTechnologies } from './technology-detector';

@Injectable()
export class FrameworkAnalyzer {
  private readonly logger = new Logger(FrameworkAnalyzer.name);

  async analyze(context: ScanAnalysisContext): Promise<void> {
    const packageJsonPaths = await findFilesByName(
      context.repositoryPath,
      new Set(['package.json']),
      6,
    );

    context.packageJsonFiles = [];
    for (const absolutePath of packageJsonPaths) {
      const content = await readTextFileIfExists(absolutePath);
      if (!content) continue;

      try {
        const relative = toRepoRelativePath(context.repositoryPath, absolutePath);
        context.packageJsonFiles.push(parsePackageJson(content, relative));
      } catch (error) {
        this.logger.warn(
          `Skipping invalid package.json at ${absolutePath}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    context.technologies = await detectTechnologies({
      repositoryPath: context.repositoryPath,
      packageJsonFiles: context.packageJsonFiles,
    });

    context.metadata.technologies = context.technologies;

    if (context.technologies.length === 0) {
      context.findings.push({
        severity: 'LOW',
        category: 'OTHER',
        title: 'No recognizable technology stack detected',
        description:
          'The repository did not expose common manifests (package.json, pom.xml, requirements.txt, Dockerfile).',
        ruleId: 'stack.unknown',
        fingerprint: 'stack.unknown',
      });
    } else {
      this.logger.log(`Detected technologies: ${context.technologies.join(', ')}`);
    }

    const rootPkg = context.packageJsonFiles.find((p) => p.filePath === 'package.json');
    if (rootPkg && !context.technologies.includes('typescript')) {
      const hasTsFiles = await this.hasTypeScriptSources(context.repositoryPath);
      if (hasTsFiles) {
        context.technologies.push('typescript');
      }
    }
  }

  private async hasTypeScriptSources(repositoryPath: string): Promise<boolean> {
    const tsFiles = await findFilesByName(repositoryPath, new Set(['tsconfig.json']), 4);
    return tsFiles.length > 0;
  }
}
