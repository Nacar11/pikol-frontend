'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/page-loading';
import { errorMessage } from '@/lib/api-error';
import { useVenues } from '../hooks/use-venues';

export function VenueList() {
  const { data, error, isPending } = useVenues();

  if (isPending && !error) return <PageLoading label="Loading venues" />;
  if (error) return <Alert tone="error">{errorMessage(error)}</Alert>;
  if (data.data.length === 0) {
    return <p className="text-sm text-muted-foreground">No venues are open for booking yet.</p>;
  }
  return (
    <ul className="divide-y divide-border rounded border border-border bg-surface">
      {data.data.map((v) => (
        <li key={v.id}>
          <Link
            href={`/venues/${v.id}`}
            className="flex items-center justify-between gap-3 p-4 hover:bg-muted"
          >
            <span>
              <span className="block font-medium">{v.name}</span>
              {v.address && (
                <span className="block text-sm text-muted-foreground">{v.address}</span>
              )}
            </span>
            <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
