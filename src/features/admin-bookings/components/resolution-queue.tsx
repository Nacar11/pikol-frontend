'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageLoading } from '@/components/ui/page-loading';
import { usePermissions } from '@/features/auth';
import { StatusBadge } from '@/features/bookings';
import { errorMessage } from '@/lib/api-error';
import { formatDayLong, formatTimeRange, manilaDayOf } from '@/lib/manila';
import { formatPeso } from '@/lib/money';
import { useResolutionQueue, useResolve } from '../hooks/use-resolution-queue';
import { ReasonForm } from './reason-form';

export function ResolutionQueue() {
  const { data, error, hasNextPage, fetchNextPage, isFetchingNextPage } = useResolutionQueue();
  const canResolve = (usePermissions().data ?? []).includes('BOOKING:CancelAny');
  const resolve = useResolve();
  const [openId, setOpenId] = useState<number | null>(null);

  if (!data) return error ? <Alert tone="error">{errorMessage(error)}</Alert> : <PageLoading />;

  const bookings = data.pages.flatMap((p) => p.data);

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">To resolve</h1>
      {error && <Alert tone="error">{errorMessage(error)}</Alert>}
      {/* Queue level: a refetch can drop the row this error is about. */}
      {resolve.isError && <Alert tone="error">{errorMessage(resolve.error)}</Alert>}
      {bookings.length === 0 ? (
        <p className="text-muted-foreground">
          Nothing to resolve. Every paid booking has its court.
        </p>
      ) : (
        <ul className="space-y-2">
          {bookings.map((b) => (
            <li key={b.id} className="space-y-2 rounded border border-border bg-surface p-3">
              <Link
                href={`/staff/bookings/${b.id}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                <span className="font-mono">{b.reference_code}</span>
                {b.player && ` · ${b.player.first_name} ${b.player.last_name}`}
              </Link>
              <p className="text-sm">
                {b.venue_name} · {b.court_name}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDayLong(manilaDayOf(b.starts_at))} ·{' '}
                {formatTimeRange(b.starts_at, b.ends_at)}
              </p>
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span>{formatPeso(b.total_centavos)}</span>
                <StatusBadge status={b.display_status} payment={b.payment_status} />
              </p>
              {b.notes && <p className="text-sm">{b.notes}</p>}
              {canResolve &&
                (openId === b.id ? (
                  <ReasonForm
                    label="How was this settled? (refund, rebook, void)"
                    submitLabel="Resolve"
                    pending={resolve.isPending}
                    onSubmit={(resolution) => {
                      resolve.mutate({ id: b.id, resolution });
                    }}
                  />
                ) : (
                  <Button variant="secondary" onClick={() => setOpenId(b.id)}>
                    Resolve
                  </Button>
                ))}
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
