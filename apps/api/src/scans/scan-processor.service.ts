import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RepositoryScanJobPayload } from '@legacyupgrader/queue-constants';
import { AiOrchestrationService } from '../ai/services/ai-orchestration.service';
import { ScanAnalysisPipeline } from '../analysis/pipeline/scan-analysis.pipeline';
import { ScanProgressService } from '../analysis/pipeline/scan-progress.service';
import { ScanCancelledError, ScanTimeoutError } from '../analysis/types/scan-analysis.types';
import { WorkspaceManagerService } from '../analysis/workspace/workspace-manager.service';
import type { EnvConfig } from '../config/env.validation';
import type { Prisma } from '@prisma/client';
import { ModernizationOutputService } from './services/modernization-output.service';
import { ReportExportService } from './services/report-export.service';
import { PrismaService } from '../prisma';

@Injectable()
export class ScanProcessorService {
  private readonly logger = new Logger(ScanProcessorService.name);
  private readonly totalTimeoutMs: number;
  private readonly aiAutoRun: boolean;

  constructor(
    private readonly pipeline: ScanAnalysisPipeline,
    private readonly workspaceManager: WorkspaceManagerService,
    private readonly progressService: ScanProgressService,
    private readonly aiOrchestration: AiOrchestrationService,
    private readonly modernizationOutput: ModernizationOutputService,
    private readonly reportExport: ReportExportService,
    private readonly prisma: PrismaService,
    config: ConfigService<EnvConfig, true>,
  ) {
    this.totalTimeoutMs = config.get('SCAN_TOTAL_TIMEOUT_MS', { infer: true });
    this.aiAutoRun = config.get('AI_AUTO_RUN_AFTER_SCAN', { infer: true });
  }

  async processRepositoryScan(payload: RepositoryScanJobPayload): Promise<void> {
    const started = Date.now();
    this.logger.log(
      `Starting scan ${payload.scanId} for repository ${payload.repositoryId}`,
    );

    try {
      const context = await this.withTotalTimeout(
        this.pipeline.execute(payload),
        this.totalTimeoutMs,
      );

      const durationMs = Date.now() - started;
      const modernizedOutput = this.modernizationOutput.generate(context);
      const metrics = this.reportExport.computeMetrics({
        findings: context.findings.map((f) => ({
          severity: f.severity,
          category: f.category,
          ruleId: f.ruleId ?? null,
        })),
        dependencyIssues: context.dependencyIssues.map((d) => ({
          severity: d.severity,
        })),
        metadata: { technologies: context.technologies },
      });

      const existing = await this.prisma.scan.findUnique({
        where: { id: payload.scanId },
        select: { metadata: true },
      });
      const prior =
        existing?.metadata && typeof existing.metadata === 'object'
          ? (existing.metadata as Record<string, unknown>)
          : {};

      await this.prisma.scan.update({
        where: { id: payload.scanId },
        data: {
          metadata: {
            ...prior,
            technologies: context.technologies,
            modernizedOutput,
            metrics,
            generatedFilesCount: modernizedOutput.length,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      await this.progressService.markCompleted(payload.scanId, payload.repositoryId, {
        technologies: context.technologies,
        metrics,
        findingsCount: context.findings.length,
        recommendationsCount: context.recommendations.length,
        dependencyIssuesCount: context.dependencyIssues.length,
        generatedFilesCount: modernizedOutput.length,
        durationMs,
        cloneDurationMs: context.cloneDurationMs,
        commitSha: context.commitSha,
      });

      this.logger.log(
        `Scan ${payload.scanId} completed in ${durationMs}ms — ${context.findings.length} findings, ${context.recommendations.length} recommendations`,
      );

      if (this.aiAutoRun) {
        await this.aiOrchestration.scheduleAfterScan({
          scanId: payload.scanId,
          repositoryId: payload.repositoryId,
          organizationId: payload.organizationId,
        });
      }
    } catch (error) {
      if (error instanceof ScanCancelledError) {
        this.logger.warn(`Scan ${payload.scanId} cancelled`);
        return;
      }

      await this.progressService.markFailed(payload.scanId, error, {
        durationMs: Date.now() - started,
      });
      throw error;
    } finally {
      await this.workspaceManager.cleanup(payload.scanId);
    }
  }

  private withTotalTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new ScanTimeoutError(`Scan exceeded total timeout of ${ms}ms`));
      }, ms);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error: unknown) => {
          clearTimeout(timer);
          reject(error instanceof Error ? error : new Error(String(error)));
        });
    });
  }
}
