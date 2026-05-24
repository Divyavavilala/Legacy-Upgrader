import type { ScanStatus } from '@prisma/client';

export interface ScanProgressResponse {
  status: ScanStatus;
  progress: number;
  currentStage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
}
