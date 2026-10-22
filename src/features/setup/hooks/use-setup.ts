'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { availabilityKeys } from '@/features/availability';
import { useAuth } from '@/features/auth';
import { catalogKeys } from '@/features/catalog';
import { setupApi } from '../api';
import { setupKeys } from '../keys';
import type { CourtCreate, CourtUpdate, VenueCreate, VenueUpdate } from '../schemas';

export function useAdminVenues() {
  const { status } = useAuth();
  return useQuery({
    queryKey: setupKeys.venues(),
    queryFn: () => setupApi.venues(),
    enabled: status === 'authenticated',
  });
}

/** Nothing is optimistic: the list is refetched after the server accepts. */
function useInvalidateVenues() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: setupKeys.venues() });
    void qc.invalidateQueries({ queryKey: catalogKeys.venues() });
  };
}

export function useCreateVenue() {
  const invalidate = useInvalidateVenues();
  return useMutation({
    mutationFn: (body: VenueCreate) => setupApi.createVenue(body),
    onSuccess: invalidate,
  });
}

export function useUpdateVenue() {
  const invalidate = useInvalidateVenues();
  return useMutation({
    mutationFn: (v: { id: number; body: VenueUpdate }) => setupApi.updateVenue(v.id, v.body),
    onSuccess: invalidate,
  });
}

export function useAdminCourts(venueId: number | null) {
  const { status } = useAuth();
  return useQuery({
    queryKey: setupKeys.courts(venueId ?? 0),
    queryFn: () => setupApi.courts(venueId!),
    enabled: status === 'authenticated' && venueId !== null,
  });
}

function useInvalidateCourts(venueId: number) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: setupKeys.courts(venueId) });
    void qc.invalidateQueries({ queryKey: availabilityKeys.all });
  };
}

export function useCreateCourt(venueId: number) {
  const invalidate = useInvalidateCourts(venueId);
  return useMutation({
    mutationFn: (body: CourtCreate) => setupApi.createCourt(venueId, body),
    onSuccess: invalidate,
  });
}

export function useUpdateCourt(venueId: number) {
  const invalidate = useInvalidateCourts(venueId);
  return useMutation({
    mutationFn: (v: { id: number; body: CourtUpdate }) => setupApi.updateCourt(v.id, v.body),
    onSuccess: invalidate,
  });
}
