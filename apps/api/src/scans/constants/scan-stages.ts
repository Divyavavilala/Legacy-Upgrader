export const SCAN_STAGES = [
  'initializing',
  'cloning',
  'framework-detection',
  'dependency-analysis',
  'architecture-analysis',
  'recommendation-generation',
] as const;

export type ScanStage = (typeof SCAN_STAGES)[number];

export const SCAN_STAGE_PROGRESS: Record<ScanStage, number> = {
  initializing: 5,
  cloning: 20,
  'framework-detection': 35,
  'dependency-analysis': 55,
  'architecture-analysis': 75,
  'recommendation-generation': 90,
};

export const SCAN_COMPLETED_PROGRESS = 100;
