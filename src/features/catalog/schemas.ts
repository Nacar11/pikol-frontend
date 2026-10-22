import { z } from 'zod';
import { pageSchema } from '@/lib/page';

export const VenueSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string().nullable(),
  is_active: z.boolean(),
});
export type Venue = z.infer<typeof VenueSchema>;

export const VenuePageSchema = pageSchema(VenueSchema);
