import type { Availability, GridCourt, GridStatus, Selection } from '@/features/availability';
import type { DisplayStatus } from '@/features/bookings';
import { formatPeso } from '@/lib/money';
import type { AdminBooking } from './schemas';

/** Staff may also pick `PAST`: free but too soon for a player, which is the
 * walk-in-now case. */
export const staffSelectable = (s: GridStatus): boolean => s === 'AVAILABLE' || s === 'PAST';

/** "New booking": the first free hour at or after `fromHour`, trying courts
 * in display order — the first court first. */
export function nextOpen(grid: Availability, fromHour: number): Selection | null {
  for (const court of grid.courts) {
    const index = court.slots.findIndex((s, i) => i >= fromHour && staffSelectable(s.status));
    if (index !== -1) return { court_id: court.court_id, start: index, end: index };
  }
  return null;
}

/** What the grid draws for a booking. One visual per state, always with a
 * text label, so the grid reads the same in greyscale. */
export type BlockKind =
  'CONFIRMED' | 'AWAITING_PAYMENT' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW' | 'CLOSED';

export const BLOCK_LABELS: Record<BlockKind, string> = {
  CONFIRMED: 'Confirmed',
  AWAITING_PAYMENT: 'Awaiting payment',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  NO_SHOW: 'No-show',
  CLOSED: 'Closed',
};

/**
 * The status as of `now`, by the server's own rule (spec §5.1): a lapsed
 * PENDING reads EXPIRED — the PENDING trap — and IN_PROGRESS is CONFIRMED
 * with `now` inside [starts_at, ends_at). Derived here as well, so the grid
 * stays exact between 30-second refetches.
 */
export function liveStatus(b: AdminBooking, now: number): DisplayStatus {
  if (b.booking_status === 'PENDING') {
    return b.expires_at !== null && Date.parse(b.expires_at) > now ? 'PENDING' : 'EXPIRED';
  }
  if (
    b.booking_status === 'CONFIRMED' &&
    Date.parse(b.starts_at) <= now &&
    now < Date.parse(b.ends_at)
  ) {
    return 'IN_PROGRESS';
  }
  return b.booking_status;
}

/** Null when the booking no longer holds its court (cancelled, expired). */
export function blockKind(b: AdminBooking, now: number): BlockKind | null {
  if (b.type === 'MAINTENANCE') return 'CLOSED';
  const status = liveStatus(b, now);
  if (status === 'CANCELLED' || status === 'EXPIRED') return null;
  if (status === 'IN_PROGRESS' || status === 'COMPLETED' || status === 'NO_SHOW') return status;
  return b.payment_status === 'PAID' ? 'CONFIRMED' : 'AWAITING_PAYMENT';
}

export type Block = {
  booking: AdminBooking;
  courtId: number;
  /** Inclusive index into the day's 24 slots. */
  start: number;
  span: number;
  kind: BlockKind;
};

const HOUR_MS = 3_600_000;

/** The day's live bookings as blocks on the grid: one per booking, spanning
 * its hours, clipped to this day (a 11 PM two-hour session shows one hour). */
export function blocksFor(grid: Availability, bookings: AdminBooking[], now: number): Block[] {
  const dayStart = Date.parse(grid.courts[0]?.slots[0]?.starts_at ?? '');
  if (Number.isNaN(dayStart)) return [];
  const blocks: Block[] = [];
  for (const booking of bookings) {
    const kind = blockKind(booking, now);
    if (!kind) continue;
    const first = Math.round((Date.parse(booking.starts_at) - dayStart) / HOUR_MS);
    const last = Math.round((Date.parse(booking.ends_at) - dayStart) / HOUR_MS);
    const start = Math.max(0, first);
    const end = Math.min(24, last);
    if (end <= start) continue;
    blocks.push({ booking, courtId: booking.court_id, start, span: end - start, kind });
  }
  return blocks;
}

/** Booked (sessions, not closures) and closed hours per court. */
export function courtHours(blocks: Block[], courtId: number): { booked: number; closed: number } {
  let booked = 0;
  let closed = 0;
  for (const b of blocks) {
    if (b.courtId !== courtId) continue;
    if (b.kind === 'CLOSED') closed += b.span;
    else booked += b.span;
  }
  return { booked, closed };
}

/** "₱500 / hr", or "from ₱400 / hr" when the day's rules vary by hour. */
export function priceLabel(court: GridCourt): string {
  const prices = court.slots.map((s) => s.price_centavos);
  if (prices.length === 0) return '';
  const low = Math.min(...prices);
  const same = prices.every((p) => p === low);
  return `${same ? '' : 'from '}${formatPeso(low)} / hr`;
}
