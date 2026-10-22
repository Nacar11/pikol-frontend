'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth';
import { useVenues, type Venue } from '@/features/catalog';

/**
 * The venue the staff console works in. A venue-bound user is pinned to
 * theirs; the all-venues owner picks one via `?venue=` (default: first
 * catalog venue). Names come from the catalog, which any signed-in user may read.
 */
export function useStaffVenue(): {
  venueId: number | null;
  venues: Venue[];
  canPick: boolean;
  setVenue: (id: number) => void;
  isPending: boolean;
  error: unknown;
} {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const catalog = useVenues();
  const venues = catalog.data?.data ?? [];

  const bound = user?.venue_id ?? null;
  const canPick = bound === null;
  let venueId: number | null = bound;
  if (canPick) {
    const wanted = Number(search.get('venue'));
    venueId = venues.find((v) => v.id === wanted)?.id ?? venues[0]?.id ?? null;
  }

  function setVenue(id: number) {
    const next = new URLSearchParams(search.toString());
    next.set('venue', String(id));
    router.replace(`${pathname}?${next.toString()}`);
  }

  return {
    venueId,
    venues,
    canPick,
    setVenue,
    isPending: canPick && catalog.isPending,
    error: catalog.error,
  };
}
