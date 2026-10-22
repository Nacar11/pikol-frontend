import type { Venue } from '@/features/catalog';
import { ApiClient, apiClient } from '@/lib/api-client';
import {
  CourtPageSchema,
  CourtSchema,
  VenuePageSchema,
  VenueSchema,
  type Court,
  type CourtCreate,
  type CourtUpdate,
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
};
