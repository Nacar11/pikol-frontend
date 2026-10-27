// What the staff console still uses from the player booking slice: the
// booking shape and its status badge. The player screens moved to the
// mobile app (ADR 0003).
export type { Booking, DisplayStatus } from './schemas';
export { BookingSchema } from './schemas';
export { StatusBadge } from './components/status-badge';
