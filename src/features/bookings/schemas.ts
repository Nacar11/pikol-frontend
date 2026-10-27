import { z } from 'zod';

const BookingTypeSchema = z.enum(['PLAYER_BOOKING', 'WALK_IN', 'MAINTENANCE']);
const BookingStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED',
  'EXPIRED',
]);
export const PaymentStatusSchema = z.enum(['UNPAID', 'PAID', 'FAILED']);
/** `IN_PROGRESS` is derived by the server and never stored. */
export const DisplayStatusSchema = z.enum([...BookingStatusSchema.options, 'IN_PROGRESS']);
const PaymentMethodSchema = z.enum(['ONLINE', 'CASH', 'MANUAL_GCASH']);

export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type DisplayStatus = z.infer<typeof DisplayStatusSchema>;

export const BookingSchema = z.object({
  id: z.number(),
  reference_code: z.string(),
  court_id: z.number(),
  venue_id: z.number(),
  court_name: z.string(),
  venue_name: z.string(),
  type: BookingTypeSchema,
  booking_status: BookingStatusSchema,
  payment_status: PaymentStatusSchema,
  display_status: DisplayStatusSchema,
  starts_at: z.string(),
  ends_at: z.string(),
  hours: z.number(),
  slots: z.array(z.object({ starts_at: z.string(), price_centavos: z.number() })),
  price_centavos: z.number(),
  fee_centavos: z.number(),
  total_centavos: z.number(),
  payment_method: PaymentMethodSchema.nullable(),
  expires_at: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  cancellation_reason: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
});
