export interface RepositoryAnalysisSnapshot {
  technologies: string[];
  findingsSummary: Array<{
    severity: string;
    category: string;
    title: string;
    ruleId?: string;
  }>;
  dependencyIssuesSummary: Array<{
    packageName: string;
    severity: string;
    currentVersion?: string;
  }>;
  recommendationsSummary: Array<{ title: string; priority: string }>;
  packageManifests: Array<{
    path: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  }>;
  configHighlights: Record<string, string>;
  repositoryName: string;
  repositorySlug: string;
}
