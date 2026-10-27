'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { staffApi } from '../api';
import { staffKeys } from '../keys';

export function useMyVenues() {
  const { status } = useAuth();
  return useQuery({
    queryKey: staffKeys.myVenues(),
    queryFn: () => staffApi.myVenues(),
    enabled: status === 'authenticated',
    staleTime: 5 * 60_000,
  });
}
