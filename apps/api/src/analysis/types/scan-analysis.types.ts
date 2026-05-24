import type {
  DependencyIssueSeverity,
  FindingCategory,
  FindingSeverity,
  MigrationEffort,
  MigrationPriority,
} from '@prisma/client';

export type DetectedTechnology =
  | 'react'
  | 'nextjs'
  | 'angular'
  | 'vue'
  | 'nodejs'
  | 'express'
  | 'nestjs'
  | 'java'
  | 'spring-boot'
  | 'maven'
  | 'gradle'
  | 'python'
  | 'django'
  | 'flask'
  | 'docker'
  | 'kubernetes'
  | 'typescript';

export interface AnalysisFindingDraft {
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  description: string;
  filePath?: string;
  lineStart?: number;
  ruleId: string;
  fingerprint: string;
  metadata?: Record<string, unknown>;
}

export interface AnalysisDependencyIssueDraft {
  packageName: string;
  currentVersion?: string;
  recommendedVersion?: string;
  severity: DependencyIssueSeverity;
  ecosystem?: string;
  isDirect?: boolean;
  cveIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface AnalysisRecommendationDraft {
  title: string;
  description: string;
  priority: MigrationPriority;
  effort: MigrationEffort;
  targetStack?: string;
  metadata?: Record<string, unknown>;
}

export interface ParsedPackageJson {
  filePath: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  engines?: Record<string, string>;
}

export interface ScanAnalysisContext {
  scanId: string;
  repositoryId: string;
  organizationId: string;
  gitUrl: string;
  branch: string;
  workspaceRoot: string;
  repositoryPath: string;
  startedAt: number;
  technologies: DetectedTechnology[];
  findings: AnalysisFindingDraft[];
  dependencyIssues: AnalysisDependencyIssueDraft[];
  recommendations: AnalysisRecommendationDraft[];
  packageJsonFiles: ParsedPackageJson[];
  commitSha?: string;
  cloneDurationMs?: number;
  metadata: Record<string, unknown>;
  cancelled: boolean;
}

export class ScanCancelledError extends Error {
  constructor() {
    super('Scan was cancelled');
    this.name = 'ScanCancelledError';
  }
}

export class ScanTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScanTimeoutError';
  }
}
