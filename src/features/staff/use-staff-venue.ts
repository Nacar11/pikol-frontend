'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMyVenues } from './hooks/use-my-venues';
import { readStorage, writeStorage } from '@/lib/storage';
import type { MyVenue } from './schemas';

/** @internal Exported for tests. */
export const VENUE_STORAGE_KEY = 'pikol:staff_venue';

/**
 * The venue the staff console acts at — what every staff request sends as
 * X-Venue-ID. Chosen from the caller's own venues (GET /users/me/venues):
 * `?venue=` first so a link is shareable, then the last one picked on this
 * browser, then the first. Permissions are per venue, so switching changes
 * what the caller may do, not just what they see.
 */
export function useStaffVenue(): {
  venueId: number | null;
  venue: MyVenue | null;
  venues: MyVenue[];
  canPick: boolean;
  setVenue: (id: number) => void;
  isPending: boolean;
  error: unknown;
} {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const mine = useMyVenues();
  const venues = mine.data ?? [];

  const listed = (id: number | null) => venues.find((v) => v.venue_id === id) ?? null;
  const venue =
    listed(Number(search.get('venue')) || null) ??
    listed(Number(readStorage(VENUE_STORAGE_KEY)) || null) ??
    venues[0] ??
    null;

  function setVenue(id: number) {
    writeStorage(VENUE_STORAGE_KEY, String(id));
    const next = new URLSearchParams(search.toString());
    next.set('venue', String(id));
    router.replace(`${pathname}?${next.toString()}`);
  }

  return {
    venueId: venue?.venue_id ?? null,
    venue,
    venues,
    canPick: venues.length > 1,
    setVenue,
    isPending: mine.isPending,
    error: mine.error,
  };
}
