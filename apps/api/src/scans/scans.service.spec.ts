import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ScanStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { QuotasService } from '../platform/quotas.service';
import { UsageService } from '../platform/usage.service';
import { PrismaService } from '../prisma';
import { QueueService } from '../queue/queue.service';
import { ScansService } from './scans.service';

describe('ScansService', () => {
  let service: ScansService;
  let prisma: {
    repository: { findFirst: jest.Mock };
    scan: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    queuedJob: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let queueService: { enqueueRepositoryScan: jest.Mock };

  const user = {
    id: 'user-1',
    email: 'dev@example.com',
    organizationId: 'org-1',
    role: 'DEVELOPER' as const,
  };

  const repository = {
    id: 'repo-1',
    organizationId: 'org-1',
    name: 'Legacy App',
    slug: 'legacy-app',
    defaultBranch: 'main',
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      repository: { findFirst: jest.fn() },
      scan: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      queuedJob: { create: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)),
    };

    queueService = {
      enqueueRepositoryScan: jest.fn().mockResolvedValue('bull-job-1'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScansService,
        { provide: PrismaService, useValue: prisma },
        { provide: QueueService, useValue: queueService },
        {
          provide: QuotasService,
          useValue: { assertWithinQuota: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: UsageService,
          useValue: {
            incrementScans: jest.fn(),
            incrementWorkerJobs: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ScansService);
  });

  describe('triggerScan', () => {
    it('creates scan, queued job, and enqueues BullMQ job', async () => {
      prisma.repository.findFirst.mockResolvedValue(repository);
      prisma.scan.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'scan-1',
          status: ScanStatus.QUEUED,
          findings: [],
          repository,
          _count: { findings: 0, dependencyIssues: 0 },
        });

      const createdScan = {
        id: 'scan-1',
        repositoryId: repository.id,
        status: ScanStatus.PENDING,
        branch: 'main',
        metadata: {},
      };

      prisma.scan.create.mockResolvedValue(createdScan);
      prisma.queuedJob.create.mockResolvedValue({ id: 'qj-1' });
      prisma.scan.update.mockResolvedValue({
        ...createdScan,
        status: ScanStatus.QUEUED,
      });

      const result = await service.triggerScan(repository.id, user);

      expect(queueService.enqueueRepositoryScan).toHaveBeenCalledWith(
        expect.objectContaining({
          scanId: 'scan-1',
          repositoryId: repository.id,
          organizationId: user.organizationId,
        }),
      );
      expect(result.status).toBe(ScanStatus.QUEUED);
    });

    it('throws when repository is not in organization', async () => {
      prisma.repository.findFirst.mockResolvedValue(null);

      await expect(service.triggerScan('missing', user)).rejects.toThrow(NotFoundException);
    });

    it('throws when a scan is already active', async () => {
      prisma.repository.findFirst.mockResolvedValue(repository);
      prisma.scan.findFirst.mockResolvedValue({
        id: 'active-scan',
        status: ScanStatus.RUNNING,
      });

      await expect(service.triggerScan(repository.id, user)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getProgress', () => {
    it('returns progress fields for org-scoped scan', async () => {
      prisma.scan.findFirst.mockResolvedValue({
        status: ScanStatus.RUNNING,
        progress: 40,
        currentStage: 'dependency-discovery',
        startedAt: new Date('2025-01-01'),
        completedAt: null,
      });

      const progress = await service.getProgress('scan-1', user.organizationId);

      expect(progress).toEqual({
        status: ScanStatus.RUNNING,
        progress: 40,
        currentStage: 'dependency-discovery',
        startedAt: expect.any(Date),
        completedAt: null,
      });
    });
  });
});
