/** Rule definition schema (scaffold — extend when migration rules are implemented). */

export interface RuleDefinition {
  id: string;
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
}

export const RULE_DEFINITIONS_VERSION = '0.0.0' as const;
