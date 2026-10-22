import { z } from 'zod';
import { VenueSchema } from '@/features/catalog';
import { pageSchema } from '@/lib/page';

export { VenueSchema };
export const VenuePageSchema = pageSchema(VenueSchema);

export const CourtSchema = z.object({
  id: z.number(),
  venue_id: z.number(),
  name: z.string(),
  sort_order: z.number(),
  is_active: z.boolean(),
});
export type Court = z.infer<typeof CourtSchema>;
export const CourtPageSchema = pageSchema(CourtSchema);

export type VenueCreate = { name: string; address?: string };
export type VenueUpdate = { name?: string; address?: string | null; is_active?: boolean };
export type CourtCreate = { name: string; sort_order?: number };
export type CourtUpdate = { name?: string; sort_order?: number; is_active?: boolean };
