'use client';

import { useResolutionQueue } from '../hooks/use-resolution-queue';

/** The sidebar count beside "To resolve" — paid bookings with no court.
 * Shown only when there is something to settle. */
export function ResolutionBadge() {
  const { data } = useResolutionQueue();
  const total = data?.pages[0]?.total ?? 0;
  if (total === 0) return null;
  return (
    <span
      aria-label={`${total} to resolve`}
      className="rounded bg-white px-1.5 text-xs font-semibold tabular-nums text-neutral-950"
    >
      {total}
    </span>
  );
}
