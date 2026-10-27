import { z } from 'zod';
import { ApiClient, apiClient } from '@/lib/api-client';
import { MyVenueSchema, type MyVenue } from './schemas';

export const staffApi = {
  myVenues(client: ApiClient = apiClient()): Promise<MyVenue[]> {
    return client.get<unknown>('/users/me/venues').then((r) => z.array(MyVenueSchema).parse(r));
  },
};
