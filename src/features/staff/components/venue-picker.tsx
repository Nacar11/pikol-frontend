'use client';

import { useStaffVenue } from '../use-staff-venue';

/** Shown only when the caller can act at more than one venue. */
export function VenuePicker() {
  const { venueId, venues, canPick, setVenue } = useStaffVenue();
  if (!canPick || venues.length === 0) return null;
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Venue</span>
      <select
        value={venueId ?? ''}
        onChange={(e) => setVenue(Number(e.target.value))}
        className="rounded border border-border bg-surface px-2 py-1.5"
      >
        {venues.map((v) => (
          <option key={v.venue_id} value={v.venue_id}>
            {v.name}
          </option>
        ))}
      </select>
    </label>
  );
}
