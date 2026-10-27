'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { groupsApi } from '../api';
import { groupKeys } from '../keys';
import type { GroupListParams } from '../schemas';

export function useGroups(params: GroupListParams, enabled = true) {
  const { status } = useAuth();
  return useQuery({
    queryKey: groupKeys.list(params),
    queryFn: () => groupsApi.list(params),
    enabled: status === 'authenticated' && enabled,
  });
}

export function usePermissionCatalogue() {
  const { status } = useAuth();
  return useQuery({
    queryKey: groupKeys.catalogue(),
    queryFn: () => groupsApi.catalogue(),
    enabled: status === 'authenticated',
    staleTime: Infinity,
  });
}

/** Owner only. Runs once the query is two characters or more. */
export function useUserSearch(q: string) {
  const { status } = useAuth();
  const term = q.trim();
  return useQuery({
    queryKey: groupKeys.userSearch(term),
    queryFn: () => groupsApi.searchUsers(term),
    enabled: status === 'authenticated' && term.length >= 2,
  });
}

export function useMembers(groupId: number) {
  const { status } = useAuth();
  return useQuery({
    queryKey: groupKeys.members(groupId),
    queryFn: () => groupsApi.members(groupId, 1),
    enabled: status === 'authenticated',
  });
}

/** Every group write. None is optimistic: the server's answer is what shows,
 * and the lists refetch either way, since a 409 means the state moved on. */
export function useGroupMutations() {
  const qc = useQueryClient();
  const refreshLists = () => qc.invalidateQueries({ queryKey: groupKeys.lists() });
  const settle = { onSettled: refreshLists };
  return {
    create: useMutation({
      mutationFn: (body: { name: string; venue_id?: number }) => groupsApi.create(body),
      ...settle,
    }),
    rename: useMutation({
      mutationFn: (v: { id: number; name: string }) => groupsApi.rename(v.id, v.name),
      ...settle,
    }),
    remove: useMutation({ mutationFn: (id: number) => groupsApi.remove(id), ...settle }),
    setPermissions: useMutation({
      mutationFn: (v: { id: number; codes: string[] }) => groupsApi.setPermissions(v.id, v.codes),
      ...settle,
    }),
    addMember: useMutation({
      mutationFn: (v: { id: number; email: string }) => groupsApi.addMember(v.id, v.email),
      onSettled: (_d, _e, v) => {
        void refreshLists();
        void qc.invalidateQueries({ queryKey: groupKeys.members(v.id) });
      },
    }),
    removeMember: useMutation({
      mutationFn: (v: { id: number; userId: number }) => groupsApi.removeMember(v.id, v.userId),
      onSettled: (_d, _e, v) => {
        void refreshLists();
        void qc.invalidateQueries({ queryKey: groupKeys.members(v.id) });
      },
    }),
  };
}
