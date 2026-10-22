'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { bookingsApi } from '../api';
import { bookingKeys } from '../keys';
import type { Booking } from '../schemas';

type BookingQueryOptions = Pick<
  UseQueryOptions<Booking, Error, Booking, ReturnType<typeof bookingKeys.detail>>,
  'refetchInterval'
>;

/** One of the signed-in player's bookings. A 404 means unknown or not theirs. */
export function useBooking(id: number, options: BookingQueryOptions = {}) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => bookingsApi.get(id),
    ...options,
  });
}
