import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

/** Registers environment-backed AI configuration (providers, limits, feature flags). */
@Global()
@Module({
  imports: [ConfigModule],
  exports: [ConfigModule],
})
export class AiConfigModule {}
