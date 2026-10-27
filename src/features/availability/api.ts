import { ApiClient, apiClient } from '@/lib/api-client';
import { AvailabilitySchema, type Availability } from './schemas';

export const availabilityApi = {
  day(venueId: number, date: string, client: ApiClient = apiClient()): Promise<Availability> {
    return client
      .get<unknown>('/availability', { params: { venue_id: venueId, date } })
      .then((r) => AvailabilitySchema.parse(r));
  },
};
