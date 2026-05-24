export const SCAN_STAGES = [
  'cloning',
  'dependency-discovery',
  'framework-detection',
  'legacy-analysis',
  'recommendation-generation',
] as const;

export type ScanStage = (typeof SCAN_STAGES)[number];

export const SCAN_STAGE_PROGRESS: Record<ScanStage, number> = {
  cloning: 20,
  'dependency-discovery': 40,
  'framework-detection': 60,
  'legacy-analysis': 80,
  'recommendation-generation': 100,
};

/** Simulated delay per stage (ms) — tune lower for tests via env if needed */
export const SCAN_STAGE_DELAY_MS = 800;
