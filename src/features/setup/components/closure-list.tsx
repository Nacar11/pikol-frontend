'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { PageLoading } from '@/components/ui/page-loading';
import { ReasonForm, type AdminBooking } from '@/features/admin-bookings';
import { errorMessage } from '@/lib/api-error';
import { formatDayChip, formatHour, manilaDayOf } from '@/lib/manila';
import { useClosures, useReopenClosure } from '../hooks/use-setup';

const HOUR_MS = 3_600_000;

/** One closure as staff entered it: the server stores a row per court, so
 * rows sharing a range and reason are shown — and reopened — together. */
type ClosureGroup = { key: string; first: AdminBooking; rows: AdminBooking[] };

function grouped(rows: AdminBooking[]): ClosureGroup[] {
  const groups = new Map<string, ClosureGroup>();
  for (const b of rows) {
    const key = `${b.starts_at}|${b.ends_at}|${b.notes ?? ''}`;
    const g = groups.get(key);
    if (g) g.rows.push(b);
    else groups.set(key, { key, first: b, rows: [b] });
  }
  return [...groups.values()];
}

function timeLine(b: AdminBooking): string {
  const hours = (Date.parse(b.ends_at) - Date.parse(b.starts_at)) / HOUR_MS;
  const endDay = manilaDayOf(new Date(Date.parse(b.ends_at) - 1).toISOString());
  const end =
    endDay === manilaDayOf(b.starts_at)
      ? formatHour(b.ends_at)
      : `${formatDayChip(endDay).date}, ${formatHour(b.ends_at)}`;
  return `${formatHour(b.starts_at)} – ${end} · ${hours} h`;
}

export function ClosureList({ venueId }: { venueId: number }) {
  const { data, error } = useClosures(venueId);
  const reopen = useReopenClosure();
  const [reopening, setReopening] = useState<string | null>(null);
  const groups = data ? grouped(data) : [];

  async function reopenGroup(g: ClosureGroup, reason: string) {
    try {
      // One court at a time: a failure stops the rest, and the refetched
      // list shows exactly which courts are still closed.
      for (const b of g.rows) await reopen.mutateAsync({ id: b.id, reason });
      setReopening(null);
    } catch {
      // Rendered from reopen.error.
    }
  }

  return (
    <section aria-labelledby="upcoming-closures" className="space-y-4">
      <div className="flex items-baseline justify-between gap-2 border-b border-border pb-3">
        <h2 id="upcoming-closures" className="text-lg font-semibold tracking-tight">
          Upcoming closures
        </h2>
        {data && (
          <p className="text-sm text-muted-foreground">
            {groups.length} {groups.length === 1 ? 'closure' : 'closures'}
          </p>
        )}
      </div>
      {reopen.isError && <Alert tone="error">{errorMessage(reopen.error)}</Alert>}
      {!data ? (
        error ? (
          <Alert tone="error">{errorMessage(error)}</Alert>
        ) : (
          <PageLoading />
        )
      ) : groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No upcoming closures. Every court is open for booking.
        </p>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => {
            const day = manilaDayOf(g.first.starts_at);
            const chip = formatDayChip(day);
            const [date, month] = chip.date.split(' ');
            const title = g.first.notes || 'Closure';
            return (
              <li key={g.key} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex gap-4">
                  <div className="w-12 shrink-0 border-r border-border pr-4 text-center">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      {chip.weekday}
                    </p>
                    <p className="text-2xl font-semibold tabular-nums leading-tight">{date}</p>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      {month}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-medium tabular-nums">{timeLine(g.first)}</p>
                    <p className="font-semibold">{title}</p>
                    <ul aria-label="Courts" className="flex flex-wrap gap-1.5">
                      {g.rows.map((b) => (
                        <li key={b.id} className="rounded bg-muted px-2 py-0.5 text-xs">
                          {b.court_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Link
                      href={`/staff/schedule?venue=${venueId}&date=${day}`}
                      aria-label={`View ${title} on the schedule`}
                      className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                    >
                      View
                    </Link>
                    {reopening !== g.key && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Reopen ${title}`}
                        onClick={() => {
                          reopen.reset();
                          setReopening(g.key);
                        }}
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>
                {reopening === g.key && (
                  <div className="mt-4 space-y-2 border-t border-border pt-4">
                    <ReasonForm
                      label={
                        g.rows.length === 1
                          ? 'Why is the court reopening?'
                          : 'Why are the courts reopening?'
                      }
                      submitLabel={g.rows.length === 1 ? 'Reopen court' : 'Reopen courts'}
                      pending={reopen.isPending}
                      onSubmit={(reason) => void reopenGroup(g, reason)}
                    />
                    <Button variant="ghost" size="sm" onClick={() => setReopening(null)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
