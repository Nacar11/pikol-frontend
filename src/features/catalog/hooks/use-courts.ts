'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { catalogApi } from '../api';
import { catalogKeys } from '../keys';

/** The venue's active courts. Any signed-in user may read them, unlike the
 * setup slice's admin list, which needs COURT:Manage. */
export function useCourts(venueId: number | null) {
  const { status } = useAuth();
  return useQuery({
    queryKey: catalogKeys.courts(venueId ?? 0),
    queryFn: () => catalogApi.courts(venueId!),
    enabled: status === 'authenticated' && venueId !== null,
  });
}
