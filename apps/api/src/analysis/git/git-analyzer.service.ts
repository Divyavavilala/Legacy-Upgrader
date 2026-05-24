import { Injectable, Logger } from '@nestjs/common';
import type { ScanAnalysisContext } from '../types/scan-analysis.types';
import { GitCloneService } from './git-clone.service';

@Injectable()
export class GitAnalyzer {
  private readonly logger = new Logger(GitAnalyzer.name);

  constructor(private readonly gitCloneService: GitCloneService) {}

  async analyze(context: ScanAnalysisContext): Promise<void> {
    if (!context.gitUrl) {
      throw new Error('Repository has no Git URL configured');
    }

    this.logger.log(
      `Cloning ${context.gitUrl} (branch=${context.branch}) into ${context.repositoryPath}`,
    );

    const result = await this.gitCloneService.cloneRepository({
      url: context.gitUrl,
      branch: context.branch,
      destination: context.repositoryPath,
    });

    context.commitSha = result.commitSha;
    context.cloneDurationMs = result.durationMs;
    context.metadata.clone = {
      branch: context.branch,
      commitSha: result.commitSha,
      durationMs: result.durationMs,
    };

    this.logger.log(
      `Clone completed in ${result.durationMs}ms (commit=${result.commitSha ?? 'unknown'})`,
    );
  }
}
