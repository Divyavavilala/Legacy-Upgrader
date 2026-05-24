import { Injectable } from '@nestjs/common';
import type { AiCompletionRequest, AiCompletionResponse } from '../types/ai.types';
import type { AiProvider } from './ai-provider.interface';

/**
 * Deterministic fallback when no LLM API keys are configured.
 * Parses structured prompts and returns JSON aligned with agent schemas.
 */
@Injectable()
export class HeuristicAiProvider implements AiProvider {
  readonly name = 'heuristic' as const;

  isConfigured(): boolean {
    return true;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const userLower = request.userPrompt.toLowerCase();
    let content: Record<string, unknown>;

    if (userLower.includes('security')) {
      content = this.securityInsight(request.userPrompt);
    } else if (userLower.includes('architecture') || userLower.includes('modularity')) {
      content = this.architectureInsight(request.userPrompt);
    } else if (userLower.includes('dependency') || userLower.includes('upgrade')) {
      content = this.dependencyInsight(request.userPrompt);
    } else if (userLower.includes('frontend') || userLower.includes('react')) {
      content = this.frontendInsight(request.userPrompt);
    } else if (userLower.includes('backend') || userLower.includes('spring')) {
      content = this.backendInsight(request.userPrompt);
    } else if (userLower.includes('devops') || userLower.includes('docker')) {
      content = this.devopsInsight(request.userPrompt);
    } else {
      content = this.genericInsight(request.userPrompt);
    }

    const serialized = JSON.stringify(content);
    return {
      content: serialized,
      promptTokens: Math.ceil(request.userPrompt.length / 4),
      completionTokens: Math.ceil(serialized.length / 4),
      model: 'heuristic-v1',
      provider: 'heuristic',
    };
  }

  private securityInsight(prompt: string): Record<string, unknown> {
    const hasVuln = /vulnerable|critical|cve/i.test(prompt);
    return {
      title: 'Security modernization review',
      summary: hasVuln
        ? 'Critical dependency and configuration risks require immediate remediation.'
        : 'Baseline security posture reviewed against analyzer findings.',
      insights: [
        'Prioritize vulnerable direct dependencies in package manifests.',
        'Ensure secrets are not committed; add pre-commit scanning.',
        'Align authentication flows with modern OIDC patterns where applicable.',
      ],
      recommendations: [
        {
          title: 'Dependency security remediation sprint',
          description: 'Upgrade flagged packages and enable automated CVE scanning in CI.',
          priority: hasVuln ? 'URGENT' : 'HIGH',
          effort: 'MEDIUM',
        },
      ],
      risks: hasVuln ? ['Known vulnerable dependencies in production path'] : [],
      confidence: 0.75,
    };
  }

  private architectureInsight(prompt: string): Record<string, unknown> {
    const monolith = /monolith|modular/i.test(prompt);
    return {
      title: 'Semantic architecture review',
      summary: monolith
        ? 'Monolithic boundaries detected; modularization recommended before major upgrades.'
        : 'Architecture shows opportunities to strengthen modularity and separation of concerns.',
      insights: [
        'Introduce clear bounded contexts between domain modules.',
        'Reduce cross-layer coupling in legacy UI code.',
        'Extract shared utilities into versioned internal packages.',
      ],
      recommendations: [
        {
          title: 'Modularization roadmap',
          description: 'Split by domain verticals with strangler-fig pattern for incremental extraction.',
          priority: 'HIGH',
          effort: 'VERY_HIGH',
          targetStack: 'Modular monorepo',
        },
      ],
      risks: monolith ? ['Single deployable unit increases blast radius of changes'] : [],
      confidence: 0.78,
    };
  }

  private dependencyInsight(_prompt: string): Record<string, unknown> {
    return {
      title: 'Dependency modernization strategy',
      summary: 'Sequenced dependency upgrades minimize breakage during modernization.',
      insights: [
        'Upgrade framework majors before transitive ecosystem packages.',
        'Run automated test suites after each upgrade tranche.',
        'Pin versions with lockfiles and renovate bot policies.',
      ],
      recommendations: [
        {
          title: 'Phased dependency upgrade plan',
          description: 'Week 1: tooling; Week 2-3: framework; Week 4: security patches.',
          priority: 'HIGH',
          effort: 'MEDIUM',
        },
      ],
      risks: [],
      confidence: 0.8,
    };
  }

  private frontendInsight(prompt: string): Record<string, unknown> {
    const react = /react/i.test(prompt);
    return {
      title: 'Frontend migration advisory',
      summary: react
        ? 'React stack modernization path defined with incremental migration steps.'
        : 'Frontend layer benefits from component framework standardization.',
      insights: [
        'Adopt React 18+ concurrent features where applicable.',
        'Replace legacy jQuery DOM manipulation with component patterns.',
        'Enable TypeScript strict mode for new modules first.',
      ],
      recommendations: [
        {
          title: 'React migration strategy',
          description: 'Introduce React 19 in greenfield routes; wrap legacy pages gradually.',
          priority: 'HIGH',
          effort: 'HIGH',
          targetStack: 'React 19',
        },
      ],
      risks: [],
      confidence: 0.77,
    };
  }

  private backendInsight(_prompt: string): Record<string, unknown> {
    return {
      title: 'Backend modernization advisory',
      summary: 'Backend services should align with LTS runtimes and supported frameworks.',
      insights: [
        'Target JDK 17+ and Spring Boot 3 for Java services.',
        'Containerize services with health checks and structured logging.',
        'Introduce API versioning for consumer compatibility.',
      ],
      recommendations: [
        {
          title: 'Spring Boot 3 migration',
          description: 'Upgrade parent POM, migrate javax imports, validate actuator endpoints.',
          priority: 'HIGH',
          effort: 'VERY_HIGH',
          targetStack: 'Spring Boot 3',
        },
      ],
      risks: [],
      confidence: 0.76,
    };
  }

  private devopsInsight(prompt: string): Record<string, unknown> {
    const noCi = /missing ci/i.test(prompt);
    return {
      title: 'DevOps modernization advisory',
      summary: 'Delivery pipeline and container strategy improvements identified.',
      insights: [
        'Add CI pipeline with lint, test, and container build stages.',
        'Use multi-stage Dockerfiles for smaller production images.',
        'Define environment-specific configuration with validation.',
      ],
      recommendations: [
        {
          title: 'CI/CD implementation roadmap',
          description: 'GitHub Actions workflow: install → lint → test → build image → scan.',
          priority: noCi ? 'HIGH' : 'MEDIUM',
          effort: 'LOW',
          targetStack: 'GitHub Actions',
        },
      ],
      risks: noCi ? ['Manual deployments increase drift and incident risk'] : [],
      confidence: 0.79,
    };
  }

  private genericInsight(prompt: string): Record<string, unknown> {
    return {
      title: 'Modernization intelligence summary',
      summary: 'Consolidated advisory based on repository analyzer outputs.',
      insights: [
        `Analyzed context length: ${prompt.length} characters of structured findings.`,
        'Align upgrades with business-critical paths first.',
        'Measure progress with objective quality gates.',
      ],
      recommendations: [],
      risks: [],
      confidence: 0.7,
    };
  }
}
