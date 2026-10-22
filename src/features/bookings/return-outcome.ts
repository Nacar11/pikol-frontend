import type { Booking } from './schemas';

export type ReturnOutcome =
  'confirmed' | 'failed' | 'unhoused' | 'lapsed' | 'cancelled' | 'pending';

/** What the checkout return page may say, from the server's booking alone. */
export function returnOutcome(b: Booking): ReturnOutcome {
  const paid = b.payment_status === 'PAID';
  if (paid && (b.booking_status === 'CONFIRMED' || b.booking_status === 'COMPLETED')) {
    return 'confirmed';
  }
  if (paid && b.booking_status === 'EXPIRED') return 'unhoused';
  if (b.payment_status === 'FAILED') return 'failed';
  if (b.display_status === 'EXPIRED') return 'lapsed';
  if (b.booking_status === 'CANCELLED') return 'cancelled';
  return 'pending';
}
