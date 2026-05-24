import { Test, type TestingModule } from '@nestjs/testing';
import { ScanStatus } from '@prisma/client';
import { PrismaService } from '../prisma';
import { MOCK_FINDING_TEMPLATES } from './data/mock-findings';
import { ScanProcessorService } from './scan-processor.service';

describe('ScanProcessorService', () => {
  let processor: ScanProcessorService;
  let prisma: {
    scan: { update: jest.Mock; findUnique: jest.Mock };
    finding: { createMany: jest.Mock };
    repository: { update: jest.Mock };
    queuedJob: { updateMany: jest.Mock };
    $transaction: jest.Mock;
  };

  const payload = {
    scanId: 'scan-1',
    repositoryId: 'repo-1',
    organizationId: 'org-1',
  };

  beforeEach(async () => {
    jest.useFakeTimers();

    prisma = {
      scan: {
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({ metadata: { stages: [] } }),
      },
      finding: { createMany: jest.fn().mockResolvedValue({ count: 6 }) },
      repository: { update: jest.fn().mockResolvedValue({}) },
      queuedJob: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ScanProcessorService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    processor = module.get(ScanProcessorService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('marks scan running, progresses stages, creates findings, and completes', async () => {
    const processPromise = processor.processRepositoryScan(payload);

    await jest.runAllTimersAsync();
    await processPromise;

    expect(prisma.scan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: payload.scanId },
        data: expect.objectContaining({ status: ScanStatus.RUNNING }),
      }),
    );

    expect(prisma.finding.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ title: MOCK_FINDING_TEMPLATES[0].title }),
      ]),
    });

    expect(prisma.scan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: payload.scanId },
        data: expect.objectContaining({ status: ScanStatus.COMPLETED, progress: 100 }),
      }),
    );
  });
});
