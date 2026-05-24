import { Badge } from '@/components/ui/badge';
import type { ScanStatus } from '@/api/types';

const STATUS_VARIANT: Record<ScanStatus, 'info' | 'warning' | 'success' | 'danger' | 'secondary'> = {
  PENDING: 'secondary',
  QUEUED: 'info',
  RUNNING: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
  CANCELLED: 'secondary',
};

export function ScanStatusBadge({ status }: { status: ScanStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status.replace('_', ' ')}</Badge>;
}
