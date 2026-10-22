'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { bookingsApi } from '../api';
import { bookingKeys } from '../keys';

/** The player's bookings, a page at a time. Lives directly on
 * `bookingKeys.mine()` so every `invalidateQueries({queryKey: mine()})`
 * still reaches it. */
export function useMyBookings() {
  return useInfiniteQuery({
    queryKey: bookingKeys.mine(),
    queryFn: ({ pageParam }) => bookingsApi.mine(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.has_more ? last.page + 1 : undefined),
  });
}
