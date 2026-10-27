import { z } from 'zod';

/** GET /users/me/venues — where the caller may act (ADR 0003). The owner
 * gets every venue with no groups; staff get each venue they hold a group at. */
export const MyVenueSchema = z.object({
  venue_id: z.number(),
  name: z.string(),
  is_master: z.boolean(),
  groups: z.array(z.string()),
});
export type MyVenue = z.infer<typeof MyVenueSchema>;
