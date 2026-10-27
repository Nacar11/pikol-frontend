'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { adminBookingsApi } from '../api';
import { adminBookingKeys } from '../keys';

export function useResolutionQueue() {
  const { status } = useAuth();
  return useInfiniteQuery({
    queryKey: adminBookingKeys.unfulfilled(),
    queryFn: ({ pageParam }) => adminBookingsApi.unfulfilled(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.has_more ? last.page + 1 : undefined),
    enabled: status === 'authenticated',
  });
}

/** Settles one flagged booking. Success and failure both refetch the queue:
 * the row leaves on success, and a 409 means the server's state moved on. */
export function useResolve() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; resolution: string }) =>
      adminBookingsApi.resolve(v.id, v.resolution),
    onSuccess: (booking) => {
      void qc.invalidateQueries({ queryKey: adminBookingKeys.unfulfilled() });
      void qc.invalidateQueries({ queryKey: adminBookingKeys.detail(booking.id) });
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: adminBookingKeys.unfulfilled() });
    },
  });
}
