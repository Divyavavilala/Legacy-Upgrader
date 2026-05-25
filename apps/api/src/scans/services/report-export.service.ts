import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import type { GeneratedOutputFile } from './modernization-output.service';

interface ModernizationMetrics {
  dependencyFreshness: number;
  ciCdReadiness: number;
  dockerReadiness: number;
  typescriptAdoption: number;
  deprecatedUsage: number;
  architectureQuality: number;
  securityScore: number;
  testCoverageSignal: number;
  overallReadiness: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class ReportExportService {
  constructor(private readonly prisma: PrismaService) {}

  async buildMarkdownReport(scanId: string, organizationId: string): Promise<string> {
    const data = await this.loadReportData(scanId, organizationId);
    const m = data.metrics;

    return `# Modernization Report — ${data.repositoryName}

**Scan ID:** \`${scanId}\`  
**Generated:** ${new Date().toISOString()}  
**Branch:** ${data.branch ?? 'main'}  
**Status:** ${data.status}

---

## Executive summary

${data.summary}

## Modernization health

| Dimension | Score |
|-----------|-------|
| Overall readiness | **${m.overallReadiness}%** (${m.riskLevel} risk) |
| Dependency freshness | ${m.dependencyFreshness}% |
| CI/CD readiness | ${m.ciCdReadiness}% |
| Docker readiness | ${m.dockerReadiness}% |
| TypeScript adoption | ${m.typescriptAdoption}% |
| Deprecated usage (inverse) | ${m.deprecatedUsage}% |
| Architecture quality | ${m.architectureQuality}% |
| Security posture | ${m.securityScore}% |
| Test coverage signals | ${m.testCoverageSignal}% |

**Estimated effort:** ${data.estimatedEffort}

---

## Tech stack

${data.technologies.length ? data.technologies.map((t) => `- ${t}`).join('\n') : '_No technologies detected_'}

---

## Findings (${data.findings.length})

${data.findings
  .slice(0, 50)
  .map(
    (f) =>
      `### [${f.severity}] ${f.title}\n${f.description ? `${f.description}\n` : ''}${f.filePath ? `_File: \`${f.filePath}\`_\n` : ''}`,
  )
  .join('\n')}

${data.findings.length > 50 ? `\n_…and ${data.findings.length -  50} more findings_\n` : ''}

---

## Dependency risks (${data.dependencyIssues.length})

${data.dependencyIssues
  .slice(0, 30)
  .map(
    (d) =>
      `- **${d.packageName}** ${d.currentVersion ?? '?'} → ${d.recommendedVersion ?? 'upgrade'} (${d.severity})${d.cveIds.length ? ` CVE: ${d.cveIds.join(', ')}` : ''}`,
  )
  .join('\n')}

---

## Architecture & security highlights

${data.architectureNotes}

---

## Migration roadmap

${data.recommendations
  .map(
    (r, i) =>
      `${i + 1}. **[${r.priority}]** ${r.title} (${r.effort} effort)${r.targetStack ? ` → ${r.targetStack}` : ''}\n   ${r.description ?? ''}`,
  )
  .join('\n\n')}

---

## Generated changes summary

${data.generatedFiles.length} files in \`modernized-output/\`:

${data.generatedFiles.map((f) => `- \`${f.path}\` (${f.changeType})`).join('\n')}

---

## Scan metadata

- Findings: ${data.findings.length}
- Recommendations: ${data.recommendations.length}
- Dependency issues: ${data.dependencyIssues.length}
`;
  }

  buildPdfBuffer(markdown: string, title: string): Buffer {
    const lines = markdown.replace(/\r/g, '').split('\n');
    const content: string[] = [];
    content.push(`BT /F1 16 Tf 50 750 Td (${this.escapePdf(title)}) Tj ET`);
    content.push(`BT /F1 10 Tf 50 720 Td (`);

    let y = 720;
    for (const line of lines.slice(0, 80)) {
      const text = line.replace(/^#+\s*/, '').slice(0, 90);
      if (!text.trim()) {
        y -= 12;
        continue;
      }
      if (y < 60) break;
      content.push(`(${this.escapePdf(text)}) Tj 0 -12 Td `);
      y -= 12;
    }
    content.push(`) Tj ET`);

    const stream = content.join('\n');
    const pdf = `%PDF-1.4
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length ${stream.length} >>stream
${stream}
endstream endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
${400 + stream.length}
%%EOF`;
    return Buffer.from(pdf, 'utf-8');
  }

  computeMetrics(scan: {
    findings: Array<{ severity: string; category: string; ruleId: string | null }>;
    dependencyIssues: Array<{ severity: string }>;
    metadata: unknown;
  }): ModernizationMetrics {
    const meta =
      scan.metadata && typeof scan.metadata === 'object'
        ? (scan.metadata as Record<string, unknown>)
        : {};
    const technologies = Array.isArray(meta.technologies)
      ? (meta.technologies as string[])
      : [];

    const critical = scan.findings.filter((f) => f.severity === 'CRITICAL').length;
    const high = scan.findings.filter((f) => f.severity === 'HIGH').length;
    const depIssues = scan.dependencyIssues.length;
    const hasDocker = !scan.findings.some((f) => f.ruleId === 'arch.missing-docker');
    const hasCi = !scan.findings.some((f) => f.ruleId === 'arch.missing-ci');
    const hasTs = technologies.some((t) => t.toLowerCase().includes('typescript'));
    const deprecated = scan.findings.filter(
      (f) => f.ruleId?.includes('outdated') || f.ruleId?.includes('deprecated'),
    ).length;

    const securityFindings = scan.findings.filter((f) => f.category === 'SECURITY').length;
    const archFindings = scan.findings.filter((f) => f.category === 'ARCHITECTURE').length;

    const penalty = critical * 15 + high * 8 + depIssues * 3 + archFindings * 2 + securityFindings * 5;
    const base = 100 - Math.min(85, penalty);

    const dependencyFreshness = Math.max(0, 100 - depIssues * 8);
    const ciCdReadiness = hasCi ? 90 : 35;
    const dockerReadiness = hasDocker ? 88 : 30;
    const typescriptAdoption = hasTs ? 85 : 40;
    const deprecatedUsage = Math.max(0, 100 - deprecated * 12);
    const architectureQuality = Math.max(0, 100 - archFindings * 10);
    const securityScore = Math.max(0, 100 - securityFindings * 12);
    const testCoverageSignal = scan.findings.some((f) => f.ruleId === 'arch.missing-tests')
      ? 45
      : 72;

    const overallReadiness = Math.round(
      (base +
        dependencyFreshness +
        ciCdReadiness +
        dockerReadiness +
        typescriptAdoption +
        deprecatedUsage +
        architectureQuality +
        securityScore +
        testCoverageSignal) /
        9,
    );

    const riskLevel: ModernizationMetrics['riskLevel'] =
      overallReadiness >= 75
        ? 'low'
        : overallReadiness >= 55
          ? 'medium'
          : overallReadiness >= 35
            ? 'high'
            : 'critical';

    return {
      dependencyFreshness,
      ciCdReadiness,
      dockerReadiness,
      typescriptAdoption,
      deprecatedUsage,
      architectureQuality,
      securityScore,
      testCoverageSignal,
      overallReadiness: Math.min(100, Math.max(0, overallReadiness)),
      riskLevel,
    };
  }

  private async loadReportData(scanId: string, organizationId: string) {
    const scan = await this.prisma.scan.findFirst({
      where: { id: scanId, repository: { organizationId, isActive: true } },
      include: {
        findings: { orderBy: [{ severity: 'desc' }] },
        dependencyIssues: { orderBy: [{ severity: 'desc' }] },
        migrationRecommendations: { orderBy: [{ priority: 'desc' }] },
        repository: { select: { name: true, slug: true, url: true } },
      },
    });

    if (!scan) {
      throw new NotFoundException('Scan not found');
    }

    const meta =
      scan.metadata && typeof scan.metadata === 'object'
        ? (scan.metadata as Record<string, unknown>)
        : {};
    const technologies = Array.isArray(meta.technologies)
      ? (meta.technologies as string[])
      : [];
    const generatedFiles = Array.isArray(meta.modernizedOutput)
      ? (meta.modernizedOutput as GeneratedOutputFile[])
      : [];

    const metrics = this.computeMetrics(scan);
    const effortHours = scan.findings.length * 2 + scan.migrationRecommendations.length * 8;
    const estimatedEffort =
      effortHours < 40
        ? `${effortHours}–${effortHours + 20} developer-hours (small)`
        : effortHours < 120
          ? `${effortHours}–${effortHours + 40} developer-hours (medium)`
          : `${effortHours}+ developer-hours (large program)`;

    const archNotes = scan.findings
      .filter((f) => f.category === 'ARCHITECTURE' || f.category === 'SECURITY')
      .slice(0, 8)
      .map((f) => `- ${f.title}`)
      .join('\n');

    return {
      repositoryName: scan.repository.name,
      branch: scan.branch,
      status: scan.status,
      summary: `Modernization readiness is **${metrics.overallReadiness}%** with **${metrics.riskLevel}** risk. The scan identified ${scan.findings.length} findings and ${scan.migrationRecommendations.length} prioritized recommendations.`,
      technologies,
      findings: scan.findings,
      dependencyIssues: scan.dependencyIssues,
      recommendations: scan.migrationRecommendations,
      generatedFiles,
      metrics,
      estimatedEffort,
      architectureNotes: archNotes || '_No critical architecture notes._',
    };
  }

  private escapePdf(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
}
