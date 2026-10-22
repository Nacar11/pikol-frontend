import { z } from 'zod';
import { BookingSchema } from '@/features/bookings';
import { pageSchema, type Page } from '@/lib/page';

export const AdminBookingSchema = BookingSchema.extend({
  player: z
    .object({
      id: z.number(),
      first_name: z.string(),
      last_name: z.string(),
      email: z.string(),
    })
    .nullable(),
  created_by_user_id: z.number(),
});
export type AdminBooking = z.infer<typeof AdminBookingSchema>;

export const AdminBookingPageSchema = pageSchema(AdminBookingSchema);
export type AdminBookingPage = Page<AdminBooking>;

export type WalkInRequest = { court_id: number; starts_at: string; hours: number; notes?: string };

/** Online money arrives only through the provider, so `ONLINE` is not offered. */
export type ManualPaymentMethod = 'CASH' | 'MANUAL_GCASH';
export type Outcome = 'COMPLETED' | 'NO_SHOW';

export type ListParams = {
  venue_id?: number;
  court_id?: number;
  date?: string;
  booking_status?: string;
  type?: string;
  page?: number;
  limit?: number;
};
