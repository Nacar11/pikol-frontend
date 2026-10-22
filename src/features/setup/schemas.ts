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

export const PriceRuleSchema = z.object({
  id: z.number(),
  court_id: z.number(),
  day_of_week: z.number().nullable(),
  hour_of_day: z.number().nullable(),
  price_centavos: z.number(),
});
export type PriceRule = z.infer<typeof PriceRuleSchema>;
export const PriceRulesSchema = z.array(PriceRuleSchema);

export const ResolvedPriceSchema = z.object({
  starts_at: z.string(),
  hour: z.number(),
  price_centavos: z.number(),
});
export type ResolvedPrice = z.infer<typeof ResolvedPriceSchema>;
export const ResolvedPricesSchema = z.array(ResolvedPriceSchema);

/** Omit `day_of_week` / `hour_of_day` for "any". Sunday is 0. */
export type PriceRuleCreate = {
  day_of_week?: number;
  hour_of_day?: number;
  price_centavos: number;
};

export type ClosureRequest = {
  court_ids: number[];
  starts_at: string;
  ends_at: string;
  reason: string;
};
/** Only the ids matter: the list is refetched, not patched. */
export const ClosedCourtsSchema = z.array(z.object({ id: z.number() }));
