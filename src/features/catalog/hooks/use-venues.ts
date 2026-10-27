'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { catalogApi } from '../api';
import { catalogKeys } from '../keys';

/** Every active venue, for the customer's booking home. */
export function useVenues() {
  const { status } = useAuth();
  return useQuery({
    queryKey: catalogKeys.venues(),
    queryFn: () => catalogApi.venues(),
    enabled: status === 'authenticated',
  });
}
