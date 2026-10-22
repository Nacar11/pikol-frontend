import { ApiClient, apiClient } from '@/lib/api-client';
import type { Page } from '@/lib/page';
import { VenuePageSchema, type Venue } from './schemas';

export const catalogApi = {
  /** One owner's venues fit in one page; there is no GET /venues/{id}. */
  venues(client: ApiClient = apiClient()): Promise<Page<Venue>> {
    return client
      .get<unknown>('/venues', { params: { limit: 100 } })
      .then((r) => VenuePageSchema.parse(r));
  },
};
