import { RULE_DEFINITIONS_VERSION } from '@legacyupgrader/rule-definitions';
import type { HealthCheckResponse } from '@legacyupgrader/shared-types';
import { env } from '@/config/env';

const placeholderHealth: HealthCheckResponse = {
  status: 'ok',
  service: env.appName,
  timestamp: new Date().toISOString(),
};

export default function App() {
  return (
    <main className="app">
      <h1>{env.appName}</h1>
      <p>Monorepo scaffold — add features in apps and packages.</p>
      <dl className="meta">
        <div>
          <dt>API URL</dt>
          <dd>{env.apiUrl}</dd>
        </div>
        <div>
          <dt>Rules package</dt>
          <dd>{RULE_DEFINITIONS_VERSION}</dd>
        </div>
        <div>
          <dt>Health (placeholder)</dt>
          <dd>{placeholderHealth.status}</dd>
        </div>
      </dl>
    </main>
  );
}
