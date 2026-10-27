import type { AdminBooking } from '@/features/admin-bookings';
import { manilaDayOf } from '@/lib/manila';

/** Hours a court can be booked in a Manila day. */
export const DAY_HOURS = 24;

/** Whether a booking occupies its hours right now. A PENDING row holds only
 * until `expires_at` — hold cleanup is lazy, so a lapsed one lingers. */
function occupies(b: AdminBooking, now: number): boolean {
  if (b.type === 'MAINTENANCE') return false;
  if (b.booking_status === 'PENDING') {
    return b.expires_at !== null && Date.parse(b.expires_at) > now;
  }
  return ['CONFIRMED', 'COMPLETED', 'NO_SHOW'].includes(b.booking_status);
}

/** Booked court-hours on `day`, per court. */
export function bookedHours(rows: AdminBooking[], day: string): Map<number, number> {
  const now = Date.now();
  const hours = new Map<number, number>();
  for (const b of rows) {
    if (!occupies(b, now)) continue;
    const onDay = b.slots.filter((s) => manilaDayOf(s.starts_at) === day).length;
    hours.set(b.court_id, (hours.get(b.court_id) ?? 0) + onDay);
  }
  return hours;
}
