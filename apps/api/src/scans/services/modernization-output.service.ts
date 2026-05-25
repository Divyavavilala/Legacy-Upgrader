import { Injectable } from '@nestjs/common';
import type { ScanAnalysisContext } from '../../analysis/types/scan-analysis.types';

export interface GeneratedOutputFile {
  path: string;
  content: string;
  changeType: 'added' | 'modified';
  description?: string;
}

@Injectable()
export class ModernizationOutputService {
  generate(context: ScanAnalysisContext): GeneratedOutputFile[] {
    const files: GeneratedOutputFile[] = [];
    const techs = context.technologies.map((t) => t.toLowerCase());
    const hasReact = techs.some((t) => t.includes('react'));
    const hasNode = techs.some((t) => t.includes('node') || t.includes('express'));
    const hasTs = techs.some((t) => t.includes('typescript'));
    const missingDocker = context.findings.some((f) => f.ruleId === 'arch.missing-docker');
    const missingCi = context.findings.some((f) => f.ruleId === 'arch.missing-ci');
    const reactOutdated = context.findings.some((f) => f.ruleId === 'deps.react-outdated');
    const missingLinter = context.findings.some((f) => f.ruleId === 'deps.missing-linter');

    if (missingDocker || hasNode) {
      files.push({
        path: 'modernized-output/Dockerfile',
        changeType: 'added',
        description: 'Multi-stage production Dockerfile',
        content: this.dockerfile(hasNode),
      });
      files.push({
        path: 'modernized-output/docker-compose.yml',
        changeType: 'added',
        description: 'Local development compose stack',
        content: this.dockerCompose(),
      });
    }

    if (missingCi) {
      files.push({
        path: 'modernized-output/.github/workflows/ci.yml',
        changeType: 'added',
        description: 'GitHub Actions CI pipeline',
        content: this.githubActionsCi(hasNode, hasTs),
      });
    }

    if (missingLinter || hasNode) {
      files.push({
        path: 'modernized-output/eslint.config.mjs',
        changeType: 'added',
        description: 'Modern flat ESLint config',
        content: this.eslintConfig(hasTs),
      });
      files.push({
        path: 'modernized-output/.prettierrc',
        changeType: 'added',
        description: 'Prettier formatting defaults',
        content: `{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
`,
      });
    }

    if (!hasTs && hasNode) {
      files.push({
        path: 'modernized-output/tsconfig.json',
        changeType: 'added',
        description: 'TypeScript strict configuration template',
        content: this.tsConfig(),
      });
      files.push({
        path: 'modernized-output/MIGRATION-JS-TO-TS.md',
        changeType: 'added',
        description: 'JS to TypeScript migration guide',
        content: this.jsToTsGuide(),
      });
    }

    if (reactOutdated || hasReact) {
      files.push({
        path: 'modernized-output/docs/REACT-HOOKS-MIGRATION.md',
        changeType: 'added',
        description: 'Class components to hooks migration patterns',
        content: this.reactHooksGuide(),
      });
    }

    if (context.dependencyIssues.length > 0) {
      files.push({
        path: 'modernized-output/package.upgrades.json',
        changeType: 'modified',
        description: 'Recommended dependency version bumps',
        content: JSON.stringify(
          {
            upgrades: context.dependencyIssues.map((d) => ({
              package: d.packageName,
              from: d.currentVersion,
              to: d.recommendedVersion ?? 'latest',
              severity: d.severity,
            })),
          },
          null,
          2,
        ),
      });
    }

    files.push({
      path: 'modernized-output/.env.example',
      changeType: 'added',
      description: 'Environment variable template with validation hints',
      content: `# Modernized environment template
NODE_ENV=development
PORT=3000
# Add secrets via your platform secret manager — never commit real values
DATABASE_URL=
API_KEY=
`,
    });

    files.push({
      path: 'modernized-output/MODERNIZATION-SUMMARY.md',
      changeType: 'added',
      description: 'Summary of generated modernization artifacts',
      content: this.summaryMarkdown(context, files),
    });

    return files;
  }

  private dockerfile(hasNode: boolean): string {
    if (hasNode) {
      return `# Multi-stage Node.js production image
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "dist/main.js"]
`;
    }
    return `FROM nginx:alpine
COPY dist/ /usr/share/nginx/html
EXPOSE 80
`;
  }

  private dockerCompose(): string {
    return `services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - .:/app
    restart: unless-stopped
`;
  }

  private githubActionsCi(hasNode: boolean, hasTs: boolean): string {
    const typecheck = hasTs ? '\n      - run: npm run typecheck' : '';
    const lint = hasNode ? '\n      - run: npm run lint' : '';
    return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npm test --if-present${lint}${typecheck}
      - run: npm run build --if-present
`;
  }

  private eslintConfig(hasTs: boolean): string {
    if (hasTs) {
      return `import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ['dist/', 'node_modules/'] },
);
`;
    }
    return `import eslint from '@eslint/js';

export default [eslint.configs.recommended, { ignores: ['dist/', 'node_modules/'] }];
`;
  }

  private tsConfig(): string {
    return `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
`;
  }

  private jsToTsGuide(): string {
    return `# JavaScript → TypeScript Migration

1. Add \`tsconfig.json\` (included in this package).
2. Rename \`.js\` entry files to \`.ts\` incrementally.
3. Enable \`strict\` after fixing implicit \`any\` in public APIs.
4. Run \`npx tsc --noEmit\` in CI before merging each batch.
`;
  }

  private reactHooksGuide(): string {
    return `# React Class → Hooks Migration

## Pattern: state + lifecycle
\`\`\`tsx
// Before (class)
class Counter extends React.Component {
  state = { count: 0 };
  componentDidMount() { /* fetch */ }
  render() { return <button onClick={() => this.setState({ count: this.state.count + 1 })}>{this.state.count}</button>; }
}

// After (hooks)
function Counter() {
  const [count, setCount] = useState(0);
  useEffect(() => { /* fetch */ }, []);
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
}
\`\`\`

Migrate one component at a time; add tests around behavior before refactoring.
`;
  }

  private summaryMarkdown(
    context: ScanAnalysisContext,
    files: GeneratedOutputFile[],
  ): string {
    return `# Modernization Output Package

Generated for scan \`${context.scanId}\`.

## Tech stack detected
${context.technologies.length ? context.technologies.map((t) => `- ${t}`).join('\n') : '- (none detected)'}

## Artifacts (${files.length} files)
${files.map((f) => `- \`${f.path}\` — ${f.description ?? f.changeType}`).join('\n')}

## Findings addressed
- ${context.findings.length} findings analyzed
- ${context.recommendations.length} recommendations applied to templates

> Review each file, adapt paths to your repo layout, then apply via PR.
`;
  }
}
