'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { notify } from '@/components/ui/snackbar';
import { errorMessage } from '@/lib/api-error';
import { useCancelCheckout, useCheckout, usePay } from '../hooks/use-checkouts';
import { formatCountdown, useSecondsLeft } from '../hooks/use-seconds-left';
import { goToMaya } from '../redirect';
import type { Checkout } from '../schemas';
import { CheckoutLines } from './checkout-lines';

/** After Pay now, before Maya (design call 4): the hold is already placed and
 * its clock is running. */
export function HoldPage({ id }: { id: number }) {
  const router = useRouter();
  const checkout = useCheckout(id);
  const status = checkout.data?.status;

  useEffect(() => {
    if (status && status !== 'PENDING') router.replace(`/book/result/${id}`);
  }, [status, id, router]);

  if (checkout.isPending) return <Skeleton className="h-96 w-full" />;
  if (checkout.isError)
    return <p className="text-sm text-destructive">Could not load this booking.</p>;
  if (checkout.data.status !== 'PENDING') return <Skeleton className="h-96 w-full" />;
  return <Held checkout={checkout.data} />;
}

function Held({ checkout }: { checkout: Checkout }) {
  const router = useRouter();
  const seconds = useSecondsLeft(checkout.expires_at);
  const pay = usePay();
  const cancel = useCancelCheckout();
  const ended = seconds === 0;
  const minutes = Math.round(
    (Date.parse(checkout.expires_at) - Date.parse(checkout.created_at)) / 60_000,
  );

  return (
    <section className="mx-auto max-w-lg space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {`${checkout.venue_name} · ${checkout.reference_code}`}
        </p>
        <h1 className="text-3xl font-semibold tabular-nums tracking-tight">
          {`Pay within ${formatCountdown(seconds)}`}
        </h1>
        {ended ? (
          <p className="text-sm font-medium">
            Your hold ended. These hours are open to everyone again.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {`Pay within ${minutes} minutes. After that the hours reopen for everyone, and a late payment is voided.`}
          </p>
        )}
      </div>
      <div className="rounded border border-border bg-surface p-4">
        <CheckoutLines checkout={checkout} />
      </div>
      <div className="flex flex-col gap-2">
        <Button
          size="full"
          disabled={ended || cancel.isPending}
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
        <Button
          size="full"
          variant="secondary"
          disabled={ended || pay.isPending}
          loading={cancel.isPending}
          onClick={() =>
            cancel.mutate(checkout.id, {
              onSuccess: () => router.push(`/book/result/${checkout.id}`),
              onError: (err) => notify.error(errorMessage(err, 'Could not cancel.')),
            })
          }
        >
          Cancel and release hours
        </Button>
        {ended && (
          <Link href={`/book/${checkout.venue_id}`} className={buttonVariants({ variant: 'link' })}>
            Book again
          </Link>
        )}
      </div>
    </section>
  );
}
