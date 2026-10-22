'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageLoading } from '@/components/ui/page-loading';
import { errorMessage } from '@/lib/api-error';
import { formatDayLong, formatTimeRange, manilaDayOf } from '@/lib/manila';
import { formatPeso } from '@/lib/money';
import { useMyBookings } from '../hooks/use-my-bookings';
import { StatusBadge } from './status-badge';

export function MyBookings() {
  const notice = useSearchParams().get('notice');
  const { data, error, hasNextPage, fetchNextPage, isFetchingNextPage } = useMyBookings();

  if (!data) return error ? <Alert tone="error">{errorMessage(error)}</Alert> : <PageLoading />;

  const bookings = data.pages.flatMap((p) => p.data);

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">My bookings</h1>
      {notice === 'provider' && (
        <Alert>
          Your hold is saved, but the payment page is unavailable. Open it below to try again.
        </Alert>
      )}
      {error && <Alert tone="error">{errorMessage(error)}</Alert>}
      {bookings.length === 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground">No bookings yet</p>
          <Link href="/venues" className="text-sm text-primary underline-offset-4 hover:underline">
            Browse venues
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link
                href={`/bookings/${b.id}`}
                className="flex flex-col gap-1 rounded border border-border bg-surface p-3 hover:bg-muted"
              >
                <span className="font-medium">
                  {b.venue_name} · {b.court_name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDayLong(manilaDayOf(b.starts_at))} ·{' '}
                  {formatTimeRange(b.starts_at, b.ends_at)}
                </span>
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  <span>{formatPeso(b.total_centavos)}</span>
                  <StatusBadge status={b.display_status} payment={b.payment_status} />
                  <span className="text-muted-foreground">{b.reference_code}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {hasNextPage && (
        <Button variant="secondary" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
          Load more
        </Button>
      )}
    </section>
  );
}
