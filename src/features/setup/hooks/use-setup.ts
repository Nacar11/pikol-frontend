'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { availabilityKeys } from '@/features/availability';
import { useAuth } from '@/features/auth';
import { catalogKeys } from '@/features/catalog';
import { setupApi } from '../api';
import { setupKeys } from '../keys';
import type {
  CourtCreate,
  CourtUpdate,
  PriceRuleCreate,
  VenueCreate,
  VenueUpdate,
} from '../schemas';

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

export function useAdminCourt(courtId: number) {
  const { status } = useAuth();
  return useQuery({
    queryKey: setupKeys.court(courtId),
    queryFn: () => setupApi.court(courtId),
    enabled: status === 'authenticated',
  });
}

export function usePriceRules(courtId: number) {
  const { status } = useAuth();
  return useQuery({
    queryKey: setupKeys.rules(courtId),
    queryFn: () => setupApi.priceRules(courtId),
    enabled: status === 'authenticated',
  });
}

/** A rule changes what a player will pay: the list, the preview of every
 * date and the availability grids are all refetched. */
function useInvalidatePricing(courtId: number) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: setupKeys.rules(courtId) });
    void qc.invalidateQueries({ queryKey: setupKeys.allPrices(courtId) });
    void qc.invalidateQueries({ queryKey: availabilityKeys.all });
  };
}

export function useCreatePriceRule(courtId: number) {
  const invalidate = useInvalidatePricing(courtId);
  return useMutation({
    mutationFn: (body: PriceRuleCreate) => setupApi.createPriceRule(courtId, body),
    onSuccess: invalidate,
  });
}

export function useUpdatePriceRule(courtId: number) {
  const invalidate = useInvalidatePricing(courtId);
  return useMutation({
    mutationFn: (v: { id: number; price_centavos: number }) =>
      setupApi.updatePriceRule(v.id, { price_centavos: v.price_centavos }),
    onSuccess: invalidate,
  });
}

export function useDeletePriceRule(courtId: number) {
  const invalidate = useInvalidatePricing(courtId);
  return useMutation({
    mutationFn: (id: number) => setupApi.deletePriceRule(id),
    onSuccess: invalidate,
  });
}

export function useDayPrices(courtId: number, date: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: setupKeys.prices(courtId, date),
    queryFn: () => setupApi.dayPrices(courtId, date),
    enabled: status === 'authenticated',
  });
}
