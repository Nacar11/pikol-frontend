import { ApiClient, apiClient } from '@/lib/api-client';
import type { Page } from '@/lib/page';
import { CourtPageSchema, VenuePageSchema, type Court, type Venue } from './schemas';

export const catalogApi = {
  /** Every active venue; needs no permission beyond sign-in. */
  venues(client: ApiClient = apiClient()): Promise<Page<Venue>> {
    return client
      .get<unknown>('/venues', { params: { limit: 100 } })
      .then((r) => VenuePageSchema.parse(r));
  },
  /** Active courts of an active venue; needs no permission beyond sign-in. */
  courts(venueId: number, client: ApiClient = apiClient()): Promise<Page<Court>> {
    return client
      .get<unknown>(`/venues/${venueId}/courts`, { params: { limit: 100 } })
      .then((r) => CourtPageSchema.parse(r));
  },
};
