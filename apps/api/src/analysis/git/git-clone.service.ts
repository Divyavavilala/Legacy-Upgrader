import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { rm } from 'node:fs/promises';
import simpleGit from 'simple-git';
import type { EnvConfig } from '../../config/env.validation';
import { safeRemoveDirectory } from '../utils/filesystem.util';

export interface GitCloneRequest {
  url: string;
  branch: string;
  destination: string;
  /** Reserved for future GitHub/GitLab token injection */
  authToken?: string;
}

export interface GitCloneResult {
  commitSha?: string;
  durationMs: number;
}

@Injectable()
export class GitCloneService {
  private readonly logger = new Logger(GitCloneService.name);
  private readonly cloneTimeoutMs: number;
  private readonly cloneDepth: number;
  private readonly maxRetries: number;

  constructor(config: ConfigService<EnvConfig, true>) {
    this.cloneTimeoutMs = config.get('SCAN_CLONE_TIMEOUT_MS', { infer: true });
    this.cloneDepth = config.get('SCAN_CLONE_DEPTH', { infer: true });
    this.maxRetries = config.get('SCAN_CLONE_MAX_RETRIES', { infer: true });
  }

  async cloneRepository(request: GitCloneRequest): Promise<GitCloneResult> {
    const started = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await safeRemoveDirectory(request.destination);
        const { mkdir } = await import('node:fs/promises');
        await mkdir(request.destination, { recursive: true });

        const result = await this.cloneOnce(request);
        return {
          ...result,
          durationMs: Date.now() - started,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `Clone attempt ${attempt}/${this.maxRetries} failed for ${request.url}: ${lastError.message}`,
        );
        await safeRemoveDirectory(request.destination);
        if (attempt < this.maxRetries) {
          await this.delay(2_000 * attempt);
        }
      }
    }

    throw this.toCloneError(request, lastError);
  }

  private async cloneOnce(request: GitCloneRequest): Promise<{ commitSha?: string }> {
    const cloneUrl = this.buildAuthenticatedUrl(request.url, request.authToken);
    const git = simpleGit();

    const clonePromise = git.clone(cloneUrl, request.destination, [
      '--depth',
      String(this.cloneDepth),
      '--branch',
      request.branch,
      '--single-branch',
    ]);

    await this.withTimeout(clonePromise, this.cloneTimeoutMs, 'Git clone timed out');

    const repoGit = simpleGit(request.destination);
    const log = await repoGit.log({ maxCount: 1 });
    const commitSha = log.latest?.hash;

    return { commitSha };
  }

  private buildAuthenticatedUrl(url: string, token?: string): string {
    if (!token) {
      return url;
    }

    try {
      const parsed = new URL(url);
      if (parsed.hostname === 'github.com') {
        parsed.username = token;
        parsed.password = 'x-oauth-basic';
      }
      return parsed.toString();
    } catch {
      return url;
    }
  }

  private toCloneError(request: GitCloneRequest, cause?: Error): Error {
    const message = cause?.message ?? 'Unknown clone error';

    if (/Authentication failed|403|401/i.test(message)) {
      return new Error(
        `Repository authentication failed. Private repositories require future OAuth/token support.`,
      );
    }
    if (/not found|404|Repository not found/i.test(message)) {
      return new Error(`Repository not found or inaccessible: ${request.url}`);
    }
    if (/Remote branch.*not found|could not find remote branch/i.test(message)) {
      return new Error(`Branch "${request.branch}" was not found in the repository.`);
    }
    if (/timed out/i.test(message)) {
      return new Error(`Clone timed out after ${this.cloneTimeoutMs}ms. The repository may be too large.`);
    }
    if (/invalid url|fatal: repository/i.test(message)) {
      return new Error(`Invalid or unreachable Git URL: ${request.url}`);
    }

    return new Error(`Failed to clone repository: ${message}`);
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), ms);
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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async removeCloneDirectory(destination: string): Promise<void> {
    await rm(destination, { recursive: true, force: true }).catch(() => undefined);
  }
}
