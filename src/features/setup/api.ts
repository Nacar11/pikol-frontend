import type { Venue } from '@/features/catalog';
import { ApiClient, apiClient } from '@/lib/api-client';
import {
  CourtPageSchema,
  CourtSchema,
  PriceRuleSchema,
  PriceRulesSchema,
  ResolvedPricesSchema,
  VenuePageSchema,
  VenueSchema,
  type Court,
  type CourtCreate,
  type CourtUpdate,
  type PriceRule,
  type PriceRuleCreate,
  type ResolvedPrice,
  type VenueCreate,
  type VenueUpdate,
} from './schemas';
import type { Page } from '@/lib/page';

const LIMIT = 100;

export const setupApi = {
  venues(client: ApiClient = apiClient()): Promise<Page<Venue>> {
    return client
      .get<unknown>('/admin/venues', { params: { limit: LIMIT } })
      .then((r) => VenuePageSchema.parse(r));
  },

  createVenue(body: VenueCreate, client: ApiClient = apiClient()): Promise<Venue> {
    return client.post<unknown>('/admin/venues', body).then((r) => VenueSchema.parse(r));
  },

  updateVenue(id: number, body: VenueUpdate, client: ApiClient = apiClient()): Promise<Venue> {
    return client.patch<unknown>(`/admin/venues/${id}`, body).then((r) => VenueSchema.parse(r));
  },

  courts(venueId: number, client: ApiClient = apiClient()): Promise<Page<Court>> {
    return client
      .get<unknown>(`/admin/venues/${venueId}/courts`, { params: { limit: LIMIT } })
      .then((r) => CourtPageSchema.parse(r));
  },

  createCourt(venueId: number, body: CourtCreate, client: ApiClient = apiClient()): Promise<Court> {
    return client
      .post<unknown>(`/admin/venues/${venueId}/courts`, body)
      .then((r) => CourtSchema.parse(r));
  },

  updateCourt(id: number, body: CourtUpdate, client: ApiClient = apiClient()): Promise<Court> {
    return client.patch<unknown>(`/admin/courts/${id}`, body).then((r) => CourtSchema.parse(r));
  },

  court(id: number, client: ApiClient = apiClient()): Promise<Court> {
    return client.get<unknown>(`/admin/courts/${id}`).then((r) => CourtSchema.parse(r));
  },

  priceRules(courtId: number, client: ApiClient = apiClient()): Promise<PriceRule[]> {
    return client
      .get<unknown>(`/admin/courts/${courtId}/price-rules`)
      .then((r) => PriceRulesSchema.parse(r));
  },

  createPriceRule(
    courtId: number,
    body: PriceRuleCreate,
    client: ApiClient = apiClient(),
  ): Promise<PriceRule> {
    return client
      .post<unknown>(`/admin/courts/${courtId}/price-rules`, body)
      .then((r) => PriceRuleSchema.parse(r));
  },

  updatePriceRule(
    id: number,
    body: { price_centavos: number },
    client: ApiClient = apiClient(),
  ): Promise<PriceRule> {
    return client
      .patch<unknown>(`/admin/price-rules/${id}`, body)
      .then((r) => PriceRuleSchema.parse(r));
  },

  deletePriceRule(id: number, client: ApiClient = apiClient()): Promise<void> {
    return client.delete<void>(`/admin/price-rules/${id}`);
  },

  /** The 24 resolved prices of a Manila day. */
  dayPrices(
    courtId: number,
    date: string,
    client: ApiClient = apiClient(),
  ): Promise<ResolvedPrice[]> {
    return client
      .get<unknown>(`/admin/courts/${courtId}/prices`, { params: { date } })
      .then((r) => ResolvedPricesSchema.parse(r));
  },
};
