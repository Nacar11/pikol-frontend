import { cn } from '@/lib/cn';
import type { DisplayStatus, PaymentStatus } from '../schemas';

const LABELS: Record<DisplayStatus, string> = {
  PENDING: 'Awaiting payment',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  NO_SHOW: 'No-show',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

const TONES: Record<DisplayStatus, string> = {
  PENDING: 'bg-muted text-foreground',
  CONFIRMED: 'bg-success/10 text-success',
  IN_PROGRESS: 'bg-success/10 text-success',
  COMPLETED: 'bg-muted text-muted-foreground',
  NO_SHOW: 'bg-destructive/10 text-destructive',
  CANCELLED: 'bg-muted text-muted-foreground',
  EXPIRED: 'bg-muted text-muted-foreground',
};

const PILL = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';

export function StatusBadge({
  status,
  payment,
}: {
  status: DisplayStatus;
  payment: PaymentStatus;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn(PILL, TONES[status])}>{LABELS[status]}</span>
      {payment === 'PAID' && <span className={cn(PILL, 'bg-success/10 text-success')}>Paid</span>}
    </span>
  );
}
