import { Injectable, Logger } from '@nestjs/common';
import type { ScanAnalysisContext } from '../types/scan-analysis.types';

@Injectable()
export class RecommendationEngine {
  private readonly logger = new Logger(RecommendationEngine.name);

  async analyze(context: ScanAnalysisContext): Promise<void> {
    const recommendations = context.recommendations;

    if (context.findings.some((f) => f.ruleId === 'deps.react-outdated')) {
      recommendations.push({
        title: 'Migrate React 16/17 to React 19',
        description:
          'Upgrade React and react-dom to the latest major, adopt the new root API, and run codemods for deprecated lifecycle methods.',
        priority: 'HIGH',
        effort: 'HIGH',
        targetStack: 'React 19',
        metadata: { category: 'frontend' },
      });
    }

    if (context.findings.some((f) => f.ruleId === 'arch.ts-strict-disabled')) {
      recommendations.push({
        title: 'Enable TypeScript strict mode',
        description:
          'Set compilerOptions.strict to true in tsconfig.json and fix type errors incrementally per package.',
        priority: 'MEDIUM',
        effort: 'MEDIUM',
        targetStack: 'TypeScript',
      });
    }

    if (
      context.findings.some((f) => f.ruleId === 'deps.missing-linter') ||
      context.findings.some((f) => f.ruleId === 'deps.missing-typescript')
    ) {
      recommendations.push({
        title: 'Add ESLint + Prettier',
        description:
          'Introduce @typescript-eslint, Prettier, and CI lint gates to prevent regressions during modernization.',
        priority: 'MEDIUM',
        effort: 'LOW',
        targetStack: 'Node.js toolchain',
      });
    }

    if (
      context.findings.some((f) => f.ruleId === 'deps.jquery') ||
      context.findings.some((f) => f.ruleId === 'arch.jquery-usage')
    ) {
      recommendations.push({
        title: 'Replace jQuery with modern UI patterns',
        description:
          'Migrate DOM manipulation to React/Vue components or vanilla modules with clear boundaries.',
        priority: 'HIGH',
        effort: 'HIGH',
        targetStack: 'Modern frontend',
      });
    }

    if (context.findings.some((f) => f.ruleId === 'arch.monolithic')) {
      recommendations.push({
        title: 'Modularize monolithic codebase',
        description:
          'Extract bounded contexts into packages or services with clear APIs before large dependency upgrades.',
        priority: 'URGENT',
        effort: 'VERY_HIGH',
        targetStack: 'Modular monorepo / microservices',
      });
    }

    if (context.findings.some((f) => f.ruleId === 'arch.missing-docker')) {
      recommendations.push({
        title: 'Add Docker support',
        description:
          'Create multi-stage Dockerfile and docker-compose for local development and CI parity.',
        priority: 'MEDIUM',
        effort: 'LOW',
        targetStack: 'Docker',
      });
    }

    for (const issue of context.dependencyIssues) {
      if (issue.severity === 'CRITICAL' || issue.severity === 'HIGH') {
        recommendations.push({
          title: `Upgrade vulnerable dependency: ${issue.packageName}`,
          description: `Bump ${issue.packageName} from ${issue.currentVersion ?? 'unknown'} to ${issue.recommendedVersion ?? 'latest patched version'}.`,
          priority: issue.severity === 'CRITICAL' ? 'URGENT' : 'HIGH',
          effort: 'LOW',
          targetStack: issue.ecosystem ?? 'dependencies',
          metadata: { packageName: issue.packageName },
        });
      }
    }

    if (context.findings.some((f) => f.ruleId === 'deps.spring-boot-outdated')) {
      recommendations.push({
        title: 'Upgrade Spring Boot to 3.x',
        description:
          'Plan Java 17 migration, update javax to jakarta packages, and run Spring Boot 3 migration guide.',
        priority: 'HIGH',
        effort: 'VERY_HIGH',
        targetStack: 'Spring Boot 3',
      });
    }

    if (context.findings.some((f) => f.ruleId === 'arch.missing-cicd')) {
      recommendations.push({
        title: 'Introduce CI/CD pipeline',
        description:
          'Add GitHub Actions (or your provider) with lint, test, and build stages on pull requests.',
        priority: 'MEDIUM',
        effort: 'LOW',
        targetStack: 'CI/CD',
      });
    }

    this.logger.log(`Generated ${recommendations.length} modernization recommendations`);
  }
}
