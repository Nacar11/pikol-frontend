'use client';

import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { notify } from '@/components/ui/snackbar';
import { errorMessage } from '@/lib/api-error';
import { useCheckout, useRefreshPayment } from '../hooks/use-checkouts';
import type { Checkout } from '../schemas';
import { CheckoutLines } from './checkout-lines';
import { StatusPill } from './status-pill';

function copy(c: Checkout): { heading: string; line: string } {
  switch (c.status) {
    case 'PENDING':
      return { heading: 'Confirming your payment…', line: 'This page updates by itself.' };
    case 'SUCCESSFUL':
      return { heading: 'Payment successful', line: 'Paid bookings are final.' };
    case 'FAILED':
      return {
        heading: 'Payment failed',
        line: "Your payment didn't go through, so the hours were released.",
      };
    case 'CANCELLED':
      return { heading: 'Payment cancelled', line: 'The hours are free again.' };
    case 'REFUNDED':
      return {
        heading: 'Paid too late — fully refunded',
        line: `Your hold had ended and an hour was taken, so nothing was booked. The full amount was ${
          c.refund_kind === 'REFUND' ? 'refunded' : 'voided'
        }.`,
      };
  }
}

/** Where Maya sends the customer back — on success, failure or cancel alike.
 * The redirect proves nothing (ADR 0004): the status shown is the server's. */
export function ResultView({ id }: { id: number }) {
  const checkout = useCheckout(id, { poll: true });
  const refresh = useRefreshPayment();

  if (checkout.isPending) return <Skeleton className="h-96 w-full" />;
  if (checkout.isError)
    return <p className="text-sm text-destructive">Could not load this booking.</p>;
  const c = checkout.data;
  const { heading, line } = copy(c);
  const released = c.status === 'FAILED' || c.status === 'CANCELLED' || c.status === 'REFUNDED';

  return (
    <section className="mx-auto max-w-lg space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <span>{c.venue_name}</span>
          <StatusPill status={c.status} />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
        <p className="text-sm text-muted-foreground">{line}</p>
      </div>
      {c.status === 'SUCCESSFUL' && (
        <div className="rounded border border-border bg-surface p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Reference</p>
          <p className="text-2xl font-semibold tracking-wider">{c.reference_code}</p>
          <p className="text-xs text-muted-foreground">Show this at the counter.</p>
        </div>
      )}
      <div className="rounded border border-border bg-surface p-4">
        <CheckoutLines checkout={c} />
      </div>
      <div className="flex flex-col gap-2">
        {c.status === 'PENDING' && (
          <Button
            variant="secondary"
            size="full"
            loading={refresh.isPending}
            onClick={() =>
              refresh.mutate(c.id, {
                onError: (err) => notify.error(errorMessage(err, 'Could not check right now.')),
              })
            }
          >
            Check again
          </Button>
        )}
        {released && (
          <Link href={`/book/${c.venue_id}`} className={buttonVariants({ size: 'full' })}>
            Book again
          </Link>
        )}
        <Link href="/book/mine" className={buttonVariants({ variant: 'link' })}>
          My bookings
        </Link>
      </div>
    </section>
  );
}
