'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi } from './api';
import { authKeys } from './keys';
import { useAuth } from './use-auth';

/** The caller's permission codes — what every UI gate reads (spec §6.1). */
export function usePermissions() {
  const { status } = useAuth();
  return useQuery({
    queryKey: authKeys.permissions(),
    queryFn: () => authApi.permissions(),
    enabled: status === 'authenticated',
    staleTime: 5 * 60_000,
  });
}
