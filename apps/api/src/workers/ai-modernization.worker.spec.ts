import type { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../config/env.validation';
import { AiModernizationWorker } from './ai-modernization.worker';
import { AiJobTimeoutError } from './base/ai-job-timeout.util';

describe('AiModernizationWorker', () => {
  it('wraps pipeline execution with configured job timeout', async () => {
    const pipeline = {
      runFullModernization: jest.fn(
        () => new Promise((resolve) => setTimeout(() => resolve('report-id'), 50)),
      ),
    };

    const worker = new AiModernizationWorker(
      pipeline as never,
      { get: () => 10 } as unknown as ConfigService<EnvConfig, true>,
    );

    await expect(
      worker['handle']({ data: { scanId: 'scan-1' }, id: 'job-1', name: 'ai-modernization' } as never),
    ).rejects.toBeInstanceOf(AiJobTimeoutError);
  });
});
