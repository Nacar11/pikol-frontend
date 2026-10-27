'use client';

import { ChevronsUpDown, MapPin } from 'lucide-react';
import { useStaffVenue } from '../use-staff-venue';

/**
 * The active venue, at the top of the sidebar. A select when the caller can
 * act at more than one venue; a plain label otherwise. Switching changes
 * what the caller may do, not only what they see — permissions are per
 * venue (ADR 0003).
 */
export function VenueSwitcher() {
  const { venue, venues, canPick, setVenue } = useStaffVenue();
  if (!venue) return null;
  const detail = venue.groups.length > 0 ? venue.groups.join(', ') : 'All venues';
  return (
    <div className="px-3">
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Venue
      </p>
      <div className="relative flex items-center gap-3 rounded-md bg-neutral-900 px-3 py-2.5 text-neutral-100 focus-within:ring-2 focus-within:ring-white">
        <MapPin aria-hidden className="size-4 shrink-0 text-neutral-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{venue.name}</p>
          <p className="truncate text-xs text-neutral-400">{detail}</p>
        </div>
        {canPick && (
          <>
            <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-neutral-400" />
            {/* A native select over the card: keyboard and screen readers
                get the platform control, sighted users the card. */}
            <select
              aria-label="Venue"
              value={venue.venue_id}
              onChange={(e) => setVenue(Number(e.target.value))}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              {venues.map((v) => (
                <option key={v.venue_id} value={v.venue_id}>
                  {v.name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </div>
  );
}
