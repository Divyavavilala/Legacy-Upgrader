import { AiTokenAccountingService } from './ai-token-accounting.service';

describe('AiTokenAccountingService', () => {
  it('summarizes scan token usage rows', async () => {
    const prisma = {
      aiTokenUsage: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          {
            totalTokens: 100,
            estimatedCostUsd: { toString: () => '0.01' },
            cacheHit: false,
          },
          {
            totalTokens: 50,
            estimatedCostUsd: { toString: () => '0.005' },
            cacheHit: true,
          },
        ]),
      },
    };

    const service = new AiTokenAccountingService(prisma as never);
    const totals = await service.getScanUsageTotals('scan-1');

    expect(totals.totalTokens).toBe(150);
    expect(totals.requests).toBe(2);
    expect(totals.cacheHits).toBe(1);
    expect(totals.estimatedCostUsd).toBeCloseTo(0.015);
  });
});
