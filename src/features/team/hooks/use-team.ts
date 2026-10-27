'use client';

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { teamApi } from '../api';
import { teamKeys } from '../keys';
import type { Invite } from '../schemas';

/** The team, a page at a time, optionally narrowed by name or email. */
export function useTeam(q = '') {
  const { status } = useAuth();
  return useInfiniteQuery({
    queryKey: teamKeys.list(q),
    queryFn: ({ pageParam }) => teamApi.list(pageParam, q),
    // A new search keeps the old rows on screen until its answer lands.
    placeholderData: keepPreviousData,
    initialPageParam: 1,
    getNextPageParam: (last) => (last.has_more ? last.page + 1 : undefined),
    enabled: status === 'authenticated',
  });
}

/** Nothing is optimistic: the list is refetched after the server accepts. */
function useInvalidateTeam() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: teamKeys.lists() });
  };
}

export function useInvite() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: (v: { invite: Invite; asOwner: boolean }) => teamApi.invite(v.invite, v.asOwner),
    onSuccess: invalidate,
  });
}

export function useSetActive() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: (v: { id: number; is_active: boolean }) =>
      teamApi.update(v.id, { is_active: v.is_active }),
    onSuccess: invalidate,
    // A 404/409 means the server's state moved on: show the truth.
    onError: invalidate,
  });
}

export function useResendInvitation() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: (id: number) => teamApi.resend(id),
    // ALREADY_ACCEPTED means the row is stale: show the truth.
    onError: invalidate,
  });
}

export function useRevokeInvitation() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: (id: number) => teamApi.revoke(id),
    onSuccess: invalidate,
    onError: invalidate,
  });
}
