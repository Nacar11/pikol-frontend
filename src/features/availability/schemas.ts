import { z } from 'zod';

export const GridStatusSchema = z.enum(['AVAILABLE', 'BOOKED', 'CLOSED', 'PAST']);
export type GridStatus = z.infer<typeof GridStatusSchema>;

export const GridSlotSchema = z.object({
  starts_at: z.string(),
  hour: z.number(),
  status: GridStatusSchema,
  price_centavos: z.number(),
});
export type GridSlot = z.infer<typeof GridSlotSchema>;

export const GridCourtSchema = z.object({
  court_id: z.number(),
  name: z.string(),
  slots: z.array(GridSlotSchema),
});
export type GridCourt = z.infer<typeof GridCourtSchema>;

export const AvailabilitySchema = z.object({
  venue_id: z.number(),
  date: z.string(),
  /** A decimal string, e.g. "3.00" — the fee shown before Pay now. */
  convenience_fee_percent: z.string(),
  courts: z.array(GridCourtSchema),
});
export type Availability = z.infer<typeof AvailabilitySchema>;
