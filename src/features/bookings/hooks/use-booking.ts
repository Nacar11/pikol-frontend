'use client';

import { useQuery } from '@tanstack/react-query';
import { bookingsApi } from '../api';
import { bookingKeys } from '../keys';

/** One of the signed-in player's bookings. A 404 means unknown or not theirs. */
export function useBooking(id: number) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => bookingsApi.get(id),
  });
}
