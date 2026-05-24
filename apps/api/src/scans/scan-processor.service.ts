import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RepositoryScanJobPayload } from '@legacyupgrader/queue-constants';
import { ScanAnalysisPipeline } from '../analysis/pipeline/scan-analysis.pipeline';
import { ScanProgressService } from '../analysis/pipeline/scan-progress.service';
import { ScanCancelledError, ScanTimeoutError } from '../analysis/types/scan-analysis.types';
import { WorkspaceManagerService } from '../analysis/workspace/workspace-manager.service';
import type { EnvConfig } from '../config/env.validation';

@Injectable()
export class ScanProcessorService {
  private readonly logger = new Logger(ScanProcessorService.name);
  private readonly totalTimeoutMs: number;

  constructor(
    private readonly pipeline: ScanAnalysisPipeline,
    private readonly workspaceManager: WorkspaceManagerService,
    private readonly progressService: ScanProgressService,
    config: ConfigService<EnvConfig, true>,
  ) {
    this.totalTimeoutMs = config.get('SCAN_TOTAL_TIMEOUT_MS', { infer: true });
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

      await this.progressService.markCompleted(payload.scanId, payload.repositoryId, {
        technologies: context.technologies,
        findingsCount: context.findings.length,
        recommendationsCount: context.recommendations.length,
        dependencyIssuesCount: context.dependencyIssues.length,
        durationMs,
        cloneDurationMs: context.cloneDurationMs,
        commitSha: context.commitSha,
      });

      this.logger.log(
        `Scan ${payload.scanId} completed in ${durationMs}ms — ${context.findings.length} findings, ${context.recommendations.length} recommendations`,
      );
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
