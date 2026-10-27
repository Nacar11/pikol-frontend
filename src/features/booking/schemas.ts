import { z } from 'zod';
import { pageSchema } from '@/lib/page';

/** The five statuses a customer sees (ADR 0004). A hold that ended reads
 * CANCELLED — the server derives it, the browser never does. */
export const CheckoutStatusSchema = z.enum([
  'PENDING',
  'SUCCESSFUL',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
]);
export type CheckoutStatus = z.infer<typeof CheckoutStatusSchema>;

const CheckoutBookingSchema = z.object({
  id: z.number(),
  reference_code: z.string(),
  court_id: z.number(),
  court_name: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  hours: z.number(),
  price_centavos: z.number(),
  booking_status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'EXPIRED']),
});

export const CheckoutSchema = z.object({
  id: z.number(),
  reference_code: z.string(),
  venue_id: z.number(),
  venue_name: z.string(),
  status: CheckoutStatusSchema,
  expires_at: z.string(),
  price_centavos: z.number(),
  fee_centavos: z.number(),
  total_centavos: z.number(),
  checkout_url: z.string().nullable(),
  refund_kind: z.enum(['VOID', 'REFUND']).nullable(),
  bookings: z.array(CheckoutBookingSchema),
  created_at: z.string(),
});
export type Checkout = z.infer<typeof CheckoutSchema>;
export const CheckoutPageSchema = pageSchema(CheckoutSchema);

/** One run of consecutive hours on one court — one booking group. */
export type CheckoutItem = { court_id: number; starts_at: string; hours: number };
