import type { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { RepositoryContextEngineService } from './repository-context-engine.service';
import type { RepositoryAnalysisSnapshot } from '../../analysis/types/repository-snapshot.types';

describe('RepositoryContextEngineService', () => {
  const snapshot: RepositoryAnalysisSnapshot = {
    technologies: ['nestjs', 'react'],
    repositoryName: 'demo-api',
    repositorySlug: 'demo-api',
    findingsSummary: [{ severity: 'HIGH', category: 'SECURITY', title: 'Outdated JWT lib' }],
    dependencyIssuesSummary: [
      { packageName: 'lodash', severity: 'HIGH', currentVersion: '4.17.20' },
    ],
    recommendationsSummary: [{ title: 'Upgrade NestJS', priority: 'HIGH' }],
    packageManifests: [
      {
        path: 'package.json',
        dependencies: { express: '^4.18.0' },
        devDependencies: {},
      },
    ],
    configHighlights: {
      'package.json': '{ "name": "demo" }',
      Dockerfile: 'FROM node:20',
    },
  };

  const service = new RepositoryContextEngineService(
    {} as never,
    {
      get: () => 4_000,
    } as unknown as ConfigService<EnvConfig, true>,
  );

  it('buildContextDocument prioritizes manifests and config before findings', () => {
    const doc = service.buildContextDocument(snapshot, 'architecture');
    const manifestIndex = doc.indexOf('Package manifests');
    const findingsIndex = doc.indexOf('Analyzer findings');
    expect(manifestIndex).toBeGreaterThan(-1);
    expect(findingsIndex).toBeGreaterThan(-1);
    expect(manifestIndex).toBeLessThan(findingsIndex);
    expect(doc).toContain('demo-api');
    expect(doc).toContain('Dockerfile');
  });
});
