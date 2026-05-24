import { Test, type TestingModule } from '@nestjs/testing';
import type { Job } from 'bullmq';
import type { RepositoryScanJobPayload } from '@legacyupgrader/queue-constants';
import { ScanProcessorService } from '../scans/scan-processor.service';
import { RepositoryScanWorker } from './repository-scan.worker';

describe('RepositoryScanWorker', () => {
  it('delegates job processing to ScanProcessorService', async () => {
    const scanProcessor = {
      processRepositoryScan: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepositoryScanWorker,
        { provide: ScanProcessorService, useValue: scanProcessor },
      ],
    }).compile();

    const worker = module.get(RepositoryScanWorker);
    const payload: RepositoryScanJobPayload = {
      scanId: 'scan-1',
      repositoryId: 'repo-1',
      organizationId: 'org-1',
    };

    const job = { data: payload, id: 'job-1', name: 'repository-scan', attemptsMade: 0, opts: { attempts: 3 } } as Job<RepositoryScanJobPayload>;

    await worker.process(job);

    expect(scanProcessor.processRepositoryScan).toHaveBeenCalledWith(payload);
  });
});
