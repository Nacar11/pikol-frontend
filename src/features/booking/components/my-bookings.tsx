'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { notify } from '@/components/ui/snackbar';
import { errorMessage } from '@/lib/api-error';
import { formatDateTime } from '@/lib/manila';
import { formatPeso } from '@/lib/money';
import { useMyCheckouts, usePay } from '../hooks/use-checkouts';
import { formatCountdown, useSecondsLeft } from '../hooks/use-seconds-left';
import { goToMaya } from '../redirect';
import type { Checkout } from '../schemas';
import { StatusPill } from './status-pill';

/** Every payment, newest first. A pending one can still be paid. */
export function MyBookings() {
  const [page, setPage] = useState(1);
  const list = useMyCheckouts(page);

  if (list.isPending) return <Skeleton className="h-64 w-full" />;
  if (list.isError)
    return <p className="text-sm text-destructive">Could not load your bookings.</p>;
  if (list.data.data.length === 0) {
    return <p className="text-sm text-muted-foreground">No bookings yet.</p>;
  }
  return (
    <div className="space-y-4">
      <ul
        aria-label="Your payments"
        className="divide-y divide-border rounded border border-border bg-surface"
      >
        {list.data.data.map((c) => (
          <Row key={c.id} checkout={c} />
        ))}
      </ul>
      {(page > 1 || list.data.has_more) && (
        <div className="flex justify-between">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Newer
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!list.data.has_more}
            onClick={() => setPage(page + 1)}
          >
            Older
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ checkout: c }: { checkout: Checkout }) {
  const hours = c.bookings.reduce((sum, b) => sum + b.hours, 0);
  const pending = c.status === 'PENDING';
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <StatusPill status={c.status} />
          <Link
            href={pending ? `/book/checkout/${c.id}` : `/book/result/${c.id}`}
            className="font-semibold tracking-wide hover:underline"
          >
            {c.reference_code}
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          {`${c.venue_name} · ${formatDateTime(c.bookings[0]?.starts_at ?? c.created_at)}`}
        </p>
        <p className="text-sm tabular-nums">{`${hours} hour${hours === 1 ? '' : 's'} · ${formatPeso(c.total_centavos)}`}</p>
      </div>
      {pending && <PayLater checkout={c} />}
    </li>
  );
}

function PayLater({ checkout }: { checkout: Checkout }) {
  const seconds = useSecondsLeft(checkout.expires_at);
  const pay = usePay();
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm tabular-nums">{`${formatCountdown(seconds)} left`}</span>
      <Button
        size="sm"
        disabled={seconds === 0}
        loading={pay.isPending}
        onClick={() =>
          pay.mutate(checkout.id, {
            onSuccess: (c) => c.checkout_url && goToMaya(c.checkout_url),
            onError: (err) => notify.error(errorMessage(err, 'Could not open Maya.')),
          })
        }
      >
        Continue to Maya
      </Button>
    </div>
  );
}
