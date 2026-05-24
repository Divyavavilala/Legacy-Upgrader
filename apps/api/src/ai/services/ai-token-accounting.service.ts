import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsageService } from '../../platform/usage.service';
import { PrismaService } from '../../prisma';
import type { AiCompletionResponse, AiProviderName } from '../types/ai.types';

/** Approximate USD per 1K tokens (illustrative; tune per provider). */
const COST_PER_1K: Record<AiProviderName, { input: number; output: number }> = {
  openai: { input: 0.00015, output: 0.0006 },
  claude: { input: 0.00025, output: 0.00125 },
  gemini: { input: 0.000075, output: 0.0003 },
  groq: { input: 0.00005, output: 0.00008 },
  heuristic: { input: 0, output: 0 },
};

@Injectable()
export class AiTokenAccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usageService: UsageService,
  ) {}

  estimateCost(response: AiCompletionResponse): number {
    const rates = COST_PER_1K[response.provider];
    return (
      (response.promptTokens / 1000) * rates.input +
      (response.completionTokens / 1000) * rates.output
    );
  }

  async recordUsage(params: {
    organizationId: string;
    scanId?: string;
    agentType?: string;
    response: AiCompletionResponse;
    cacheHit: boolean;
    requestHash?: string;
  }): Promise<void> {
    const totalTokens = params.response.promptTokens + params.response.completionTokens;
    const cost = this.estimateCost(params.response);

    await this.prisma.aiTokenUsage.create({
      data: {
        organizationId: params.organizationId,
        scanId: params.scanId,
        provider: params.response.provider,
        model: params.response.model,
        agentType: params.agentType,
        promptTokens: params.response.promptTokens,
        completionTokens: params.response.completionTokens,
        totalTokens,
        estimatedCostUsd: new Prisma.Decimal(cost.toFixed(6)),
        cacheHit: params.cacheHit,
        requestHash: params.requestHash,
      },
    });

    if (!params.cacheHit) {
      await this.usageService.incrementAiTokens(params.organizationId, totalTokens);
    }
  }

  async getScanUsageTotals(scanId: string) {
    const rows = await this.prisma.aiTokenUsage.findMany({ where: { scanId } });
    return this.summarizeRows(rows);
  }

  async getRecentPlatformTotals() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await this.prisma.aiTokenUsage.findMany({
      where: { createdAt: { gte: since } },
    });
    return { ...this.summarizeRows(rows), window: '24h' as const };
  }

  private summarizeRows(
    rows: Array<{
      totalTokens: number;
      estimatedCostUsd: { toString(): string } | null;
      cacheHit: boolean;
    }>,
  ) {
    return {
      totalTokens: rows.reduce((sum, r) => sum + r.totalTokens, 0),
      estimatedCostUsd: rows.reduce(
        (sum, r) => sum + Number(r.estimatedCostUsd ?? 0),
        0,
      ),
      requests: rows.length,
      cacheHits: rows.filter((r) => r.cacheHit).length,
      window: 'all' as const,
    };
  }
}
