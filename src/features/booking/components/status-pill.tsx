import { Pill } from '@/components/ui/pill';
import type { CheckoutStatus } from '../schemas';

const LABEL: Record<CheckoutStatus, string> = {
  PENDING: 'Pending',
  SUCCESSFUL: 'Successful',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

/** The text carries the status; the tone only separates paid from not. */
export function StatusPill({ status }: { status: CheckoutStatus }) {
  const tone = status === 'SUCCESSFUL' ? 'solid' : status === 'PENDING' ? 'dashed' : 'outline';
  return <Pill tone={tone}>{LABEL[status]}</Pill>;
}
