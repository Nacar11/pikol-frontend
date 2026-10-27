import { ApiClient, apiClient } from '@/lib/api-client';
import type { Page } from '@/lib/page';
import { CourtPageSchema, type Court } from './schemas';

export const catalogApi = {
  /** Active courts of an active venue; needs no permission beyond sign-in. */
  courts(venueId: number, client: ApiClient = apiClient()): Promise<Page<Court>> {
    return client
      .get<unknown>(`/venues/${venueId}/courts`, { params: { limit: 100 } })
      .then((r) => CourtPageSchema.parse(r));
  },
};
