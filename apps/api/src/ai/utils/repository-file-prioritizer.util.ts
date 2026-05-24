/** Relative path patterns scored for AI context (higher = included first). */
const PRIORITY_RULES: Array<{ pattern: RegExp; score: number }> = [
  { pattern: /(^|\/)package\.json$/i, score: 100 },
  { pattern: /(^|\/)tsconfig(\..+)?\.json$/i, score: 95 },
  { pattern: /(^|\/)Dockerfile$/i, score: 90 },
  { pattern: /(^|\/)docker-compose(\..+)?\.ya?ml$/i, score: 88 },
  { pattern: /^\.github\/workflows\/.+\.ya?ml$/i, score: 85 },
  { pattern: /(^|\/)\.gitlab-ci\.ya?ml$/i, score: 84 },
  { pattern: /azure-pipelines\.ya?ml$/i, score: 83 },
  { pattern: /Jenkinsfile$/i, score: 82 },
  { pattern: /(^|\/)pom\.xml$/i, score: 80 },
  { pattern: /(^|\/)build\.gradle(\.kts)?$/i, score: 80 },
  { pattern: /(^|\/)requirements\.txt$/i, score: 78 },
  { pattern: /(^|\/)pyproject\.toml$/i, score: 78 },
  { pattern: /(^|\/)nest-cli\.json$/i, score: 70 },
  { pattern: /(^|\/)vite\.config\.(ts|js|mjs)$/i, score: 68 },
  { pattern: /(^|\/)webpack\.config\.(ts|js)$/i, score: 65 },
];

export function scoreRepositoryFile(relativePath: string): number {
  const normalized = relativePath.replace(/\\/g, '/');
  let score = 0;
  for (const rule of PRIORITY_RULES) {
    if (rule.pattern.test(normalized)) {
      score = Math.max(score, rule.score);
    }
  }
  return score;
}

export const CONFIG_FILE_NAMES = new Set([
  'package.json',
  'tsconfig.json',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  '.gitlab-ci.yml',
  'Jenkinsfile',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'requirements.txt',
  'pyproject.toml',
  'nest-cli.json',
]);
