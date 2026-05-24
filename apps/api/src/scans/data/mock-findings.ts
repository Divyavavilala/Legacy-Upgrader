import { FindingCategory, FindingSeverity } from '@prisma/client';

export interface MockFindingTemplate {
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  description: string;
  filePath?: string;
  lineStart?: number;
  ruleId: string;
  fingerprint: string;
}

export const MOCK_FINDING_TEMPLATES: MockFindingTemplate[] = [
  {
    severity: FindingSeverity.HIGH,
    category: FindingCategory.DEPENDENCY,
    title: 'Outdated React version',
    description:
      'React 16.14.0 is installed. React 18+ is recommended for concurrent features and security patches.',
    filePath: 'package.json',
    ruleId: 'legacy.react-outdated',
    fingerprint: 'legacy.react-outdated',
  },
  {
    severity: FindingSeverity.CRITICAL,
    category: FindingCategory.SECURITY,
    title: 'Deprecated Java APIs in use',
    description:
      'Usage of sun.misc.Unsafe and internal JDK APIs detected. These APIs are removed or restricted in JDK 17+.',
    filePath: 'src/main/java/com/example/LegacyService.java',
    lineStart: 42,
    ruleId: 'legacy.java-deprecated-api',
    fingerprint: 'legacy.java-deprecated-api',
  },
  {
    severity: FindingSeverity.MEDIUM,
    category: FindingCategory.CODE_QUALITY,
    title: 'Legacy jQuery usage',
    description:
      'Direct DOM manipulation via jQuery detected in 14 files. Consider migrating to a modern component framework.',
    filePath: 'src/static/js/app.js',
    lineStart: 128,
    ruleId: 'legacy.jquery-usage',
    fingerprint: 'legacy.jquery-usage',
  },
  {
    severity: FindingSeverity.LOW,
    category: FindingCategory.CODE_QUALITY,
    title: 'Missing TypeScript strict mode',
    description:
      'tsconfig.json has strict: false. Enabling strict mode improves type safety during modernization.',
    filePath: 'tsconfig.json',
    ruleId: 'legacy.ts-strict-mode',
    fingerprint: 'legacy.ts-strict-mode',
  },
  {
    severity: FindingSeverity.CRITICAL,
    category: FindingCategory.SECURITY,
    title: 'Vulnerable dependency: lodash',
    description:
      'lodash@4.17.15 has known CVEs. Upgrade to lodash@4.17.21 or later.',
    filePath: 'package-lock.json',
    ruleId: 'legacy.vulnerable-dependency',
    fingerprint: 'legacy.vulnerable-dependency-lodash',
  },
  {
    severity: FindingSeverity.HIGH,
    category: FindingCategory.ARCHITECTURE,
    title: 'Monolithic architecture warning',
    description:
      'Single deployable artifact with 240+ modules and no bounded contexts. Consider modularization before incremental upgrades.',
    ruleId: 'legacy.monolithic-architecture',
    fingerprint: 'legacy.monolithic-architecture',
  },
];
