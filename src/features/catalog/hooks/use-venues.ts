'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { catalogApi } from '../api';
import { catalogKeys } from '../keys';
import type { Venue } from '../schemas';

export function useVenues() {
  const { status } = useAuth();
  return useQuery({
    queryKey: catalogKeys.venues(),
    queryFn: () => catalogApi.venues(),
    enabled: status === 'authenticated',
    staleTime: 5 * 60_000,
  });
}

/** From the cached list (the API has no single-venue read). `venue` is
 * `undefined` while loading (or after a failed load, with `error` set), and
 * `'not-found'` once the list is in and the id is not. */
export function useVenue(id: number): {
  venue: Venue | undefined | 'not-found';
  error: Error | null;
} {
  const { data, error } = useVenues();
  if (!data) return { venue: undefined, error };
  return { venue: data.data.find((v) => v.id === id) ?? 'not-found', error };
}
