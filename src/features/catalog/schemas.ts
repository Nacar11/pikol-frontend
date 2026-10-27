import { z } from 'zod';
import { pageSchema } from '@/lib/page';

export const VenueSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string().nullable(),
  is_active: z.boolean(),
});
export type Venue = z.infer<typeof VenueSchema>;

export const CourtSchema = z.object({
  id: z.number(),
  venue_id: z.number(),
  name: z.string(),
  sort_order: z.number(),
  is_active: z.boolean(),
});
export type Court = z.infer<typeof CourtSchema>;
export const CourtPageSchema = pageSchema(CourtSchema);
