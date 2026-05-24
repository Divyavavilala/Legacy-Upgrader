import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators';
import type { EnvConfig } from '../../config/env.validation';
import { AiProviderRegistry } from '../providers/ai-provider.registry';

@ApiTags('ai')
@Controller('ai')
export class AiHealthController {
  constructor(
    private readonly providerRegistry: AiProviderRegistry,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'AI subsystem health and provider diagnostics' })
  getHealth() {
    const providers = this.providerRegistry.getDiagnostics();
    const configuredCount = providers.filter((p) => p.configured).length;

    return {
      status: this.config.get('AI_ENABLED', { infer: true }) ? 'enabled' : 'disabled',
      autoRunAfterScan: this.config.get('AI_AUTO_RUN_AFTER_SCAN', { infer: true }),
      defaultProvider: this.config.get('AI_DEFAULT_PROVIDER', { infer: true }),
      fallbackProvider: this.config.get('AI_FALLBACK_PROVIDER', { infer: true }),
      providers,
      ready: configuredCount > 0,
      mode: configuredCount > 0 ? 'llm' : 'heuristic-fallback',
      checkedAt: new Date().toISOString(),
    };
  }
}
