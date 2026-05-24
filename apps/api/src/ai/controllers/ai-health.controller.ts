import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from '@legacyupgrader/queue-constants';
import { Public } from '../../common/decorators';
import type { EnvConfig } from '../../config/env.validation';
import { QueueService } from '../../queue/queue.service';
import type { AiHealthResponseDto } from '../dto/ai-health-response.dto';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { AiTokenAccountingService } from '../services/ai-token-accounting.service';

const AI_QUEUE_NAMES = [
  QUEUE_NAMES.AI_MODERNIZATION,
  QUEUE_NAMES.AI_SECURITY_REVIEW,
  QUEUE_NAMES.AI_ARCHITECTURE_ANALYSIS,
] as const;

@ApiTags('ai')
@Controller('ai')
export class AiHealthController {
  constructor(
    private readonly providerRegistry: AiProviderRegistry,
    private readonly tokenAccounting: AiTokenAccountingService,
    private readonly queueService: QueueService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'AI subsystem health and provider diagnostics' })
  async getHealth(): Promise<AiHealthResponseDto> {
    const providers = this.providerRegistry.getDiagnostics();
    const configuredCount = providers.filter((p) => p.configured).length;

    const dashboard = await this.queueService.getDashboardHealth();
    const aiQueues = dashboard.queues
      .filter((q) => AI_QUEUE_NAMES.includes(q.name as (typeof AI_QUEUE_NAMES)[number]))
      .map((q) => ({
        name: q.name,
        status: q.status,
        waiting: q.counts.waiting,
        active: q.counts.active,
        failed: q.counts.failed,
      }));

    const tokenUsage = await this.tokenAccounting.getRecentPlatformTotals();

    return {
      status: this.config.get('AI_ENABLED', { infer: true }) ? 'enabled' : 'disabled',
      autoRunAfterScan: this.config.get('AI_AUTO_RUN_AFTER_SCAN', { infer: true }),
      defaultProvider: this.config.get('AI_DEFAULT_PROVIDER', { infer: true }),
      fallbackProvider: this.config.get('AI_FALLBACK_PROVIDER', { infer: true }),
      providers,
      ready: configuredCount > 0,
      mode: configuredCount > 0 ? 'llm' : 'heuristic-fallback',
      queue: {
        status: dashboard.status,
        aiQueues,
      },
      tokenUsage,
      checkedAt: new Date().toISOString(),
    };
  }
}
