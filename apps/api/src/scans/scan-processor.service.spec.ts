import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { ScanAnalysisPipeline } from '../analysis/pipeline/scan-analysis.pipeline';
import { ScanProgressService } from '../analysis/pipeline/scan-progress.service';
import { WorkspaceManagerService } from '../analysis/workspace/workspace-manager.service';
import { AiOrchestrationService } from '../ai/services/ai-orchestration.service';
import { ScanProcessorService } from './scan-processor.service';

describe('ScanProcessorService', () => {
  let processor: ScanProcessorService;
  let pipeline: { execute: jest.Mock };
  let workspaceManager: { cleanup: jest.Mock };
  let progressService: { markCompleted: jest.Mock; markFailed: jest.Mock };

  const payload = {
    scanId: 'scan-1',
    repositoryId: 'repo-1',
    organizationId: 'org-1',
  };

  beforeEach(async () => {
    pipeline = {
      execute: jest.fn().mockResolvedValue({
        scanId: payload.scanId,
        repositoryId: payload.repositoryId,
        organizationId: payload.organizationId,
        findings: [{ title: 'Outdated React version' }],
        recommendations: [{ title: 'Migrate React' }],
        dependencyIssues: [],
        technologies: ['react', 'nodejs'],
        startedAt: Date.now(),
        cloneDurationMs: 1200,
        commitSha: 'abc123',
      }),
    };

    workspaceManager = { cleanup: jest.fn().mockResolvedValue(undefined) };
    progressService = {
      markCompleted: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScanProcessorService,
        { provide: ScanAnalysisPipeline, useValue: pipeline },
        { provide: WorkspaceManagerService, useValue: workspaceManager },
        { provide: ScanProgressService, useValue: progressService },
        {
          provide: AiOrchestrationService,
          useValue: { scheduleAfterScan: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'AI_AUTO_RUN_AFTER_SCAN') return true;
              return 600_000;
            }),
          },
        },
      ],
    }).compile();

    processor = module.get(ScanProcessorService);
  });

  it('runs pipeline, marks completed, and always cleans workspace', async () => {
    await processor.processRepositoryScan(payload);

    expect(pipeline.execute).toHaveBeenCalledWith(payload);
    expect(progressService.markCompleted).toHaveBeenCalledWith(
      payload.scanId,
      payload.repositoryId,
      expect.objectContaining({
        findingsCount: 1,
        recommendationsCount: 1,
        technologies: ['react', 'nodejs'],
      }),
    );
    expect(workspaceManager.cleanup).toHaveBeenCalledWith(payload.scanId);
  });

  it('marks failed and still cleans workspace on pipeline error', async () => {
    pipeline.execute.mockRejectedValue(new Error('clone failed'));

    await expect(processor.processRepositoryScan(payload)).rejects.toThrow('clone failed');

    expect(progressService.markFailed).toHaveBeenCalled();
    expect(workspaceManager.cleanup).toHaveBeenCalledWith(payload.scanId);
  });
});
