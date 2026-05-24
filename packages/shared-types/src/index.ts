/** Shared domain types for LegacyUpgrader (scaffold — extend as features are added). */

export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface HealthCheckResponse {
  status: HealthStatus;
  service: string;
  timestamp: string;
}
