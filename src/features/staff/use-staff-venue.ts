'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMyVenues } from './hooks/use-my-venues';
import type { MyVenue } from './schemas';

export const VENUE_STORAGE_KEY = 'pikol:staff_venue';

/** Browser storage can be absent or throw (private mode, blocked site data);
 * the remembered venue is a convenience, never required. */
function remembered(): number | null {
  try {
    const raw = window.localStorage.getItem(VENUE_STORAGE_KEY);
    return raw === null ? null : Number(raw);
  } catch {
    return null;
  }
}

function remember(id: number): void {
  try {
    window.localStorage.setItem(VENUE_STORAGE_KEY, String(id));
  } catch {
    // Not remembering is fine; the URL still carries it.
  }
}

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
    listed(Number(search.get('venue')) || null) ?? listed(remembered()) ?? venues[0] ?? null;

  function setVenue(id: number) {
    remember(id);
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
