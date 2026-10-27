'use client';

import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useVenues } from '@/features/catalog';

export function VenueCards() {
  const venues = useVenues();
  if (venues.isPending) return <Skeleton className="h-28 w-full" />;
  if (venues.isError) return <p className="text-sm text-destructive">Could not load venues.</p>;
  if (venues.data.data.length === 0) {
    return <p className="text-sm text-muted-foreground">No venues are open for booking yet.</p>;
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {venues.data.data.map((v) => (
        <li key={v.id}>
          <Link
            href={`/book/${v.id}`}
            className="block h-full rounded border border-border bg-surface p-4 hover:bg-muted"
          >
            <span className="block text-lg font-semibold">{v.name}</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {v.address ?? 'Pick a court and an hour'}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
