import type { AdminBooking } from './schemas';

type StaffAction = 'markPaid' | 'outcome' | 'cancel' | 'reopen';

/** Which actions the detail offers (spec §5.2). One table instead of conditions
 * scattered through JSX. A convenience only: the server re-checks every guard,
 * so a skewed clock or a stale booking shows or hides a button, never decides. */
export function staffActions(
  b: AdminBooking,
  permissions: string[],
  nowMs: number,
): Set<StaffAction> {
  const can = (code: string) => permissions.includes(code);
  const closure = b.type === 'MAINTENANCE';
  const confirmed = b.booking_status === 'CONFIRMED';
  const out = new Set<StaffAction>();

  if (
    can('BOOKING:MarkPaid') &&
    b.type === 'WALK_IN' &&
    b.payment_status === 'UNPAID' &&
    (confirmed || b.booking_status === 'COMPLETED')
  ) {
    out.add('markPaid');
  }
  // After the last hour the server's display status is CONFIRMED again, so the
  // start time decides, not IN_PROGRESS alone.
  if (
    can('BOOKING:SetOutcome') &&
    !closure &&
    confirmed &&
    (b.display_status === 'IN_PROGRESS' || Date.parse(b.starts_at) <= nowMs)
  ) {
    out.add('outcome');
  }
  if (can('BOOKING:CancelAny') && !closure && confirmed) out.add('cancel');
  if (can('CLOSURE:Manage') && closure && confirmed) out.add('reopen');
  return out;
}
