import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import path from 'node:path';
import type { EnvConfig } from '../../config/env.validation';
import { safeRemoveDirectory } from '../utils/filesystem.util';
import { assertSafeScanId, resolveWithinBase } from '../utils/path-safety.util';

@Injectable()
export class WorkspaceManagerService {
  private readonly logger = new Logger(WorkspaceManagerService.name);
  private readonly workspaceRoot: string;

  constructor(config: ConfigService<EnvConfig, true>) {
    const configured = config.get('SCAN_WORKSPACE_ROOT', { infer: true });
    this.workspaceRoot = path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
  }

  /** Returns scan workspace root: tmp/scans/{scanId}/ */
  prepareWorkspace(scanId: string): { workspaceRoot: string; repositoryPath: string } {
    assertSafeScanId(scanId);
    const workspaceRoot = resolveWithinBase(this.workspaceRoot, scanId);
    const repositoryPath = resolveWithinBase(workspaceRoot, 'repo');
    return { workspaceRoot, repositoryPath };
  }

  async ensureWorkspace(scanId: string): Promise<{ workspaceRoot: string; repositoryPath: string }> {
    const paths = this.prepareWorkspace(scanId);
    const { mkdir } = await import('node:fs/promises');
    await mkdir(paths.repositoryPath, { recursive: true });
    this.logger.debug(`Workspace ready: ${paths.workspaceRoot}`);
    return paths;
  }

  async cleanup(scanId: string): Promise<void> {
    assertSafeScanId(scanId);
    const workspaceRoot = resolveWithinBase(this.workspaceRoot, scanId);
    this.logger.debug(`Cleaning workspace: ${workspaceRoot}`);
    await safeRemoveDirectory(workspaceRoot);
  }
}
