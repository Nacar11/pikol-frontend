'use client';

import { Alert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/page-loading';
import { ReasonForm } from '@/features/admin-bookings';
import { errorMessage } from '@/lib/api-error';
import { formatDateTime } from '@/lib/manila';
import { useClosures, useReopenClosure } from '../hooks/use-setup';

export function ClosureList({ venueId }: { venueId: number }) {
  const { data, error } = useClosures(venueId);
  const reopen = useReopenClosure();

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Upcoming closures</h2>
      {reopen.isError && <Alert tone="error">{errorMessage(reopen.error)}</Alert>}
      {!data ? (
        error ? (
          <Alert tone="error">{errorMessage(error)}</Alert>
        ) : (
          <PageLoading />
        )
      ) : data.length === 0 ? (
        <p className="text-muted-foreground">No upcoming closures.</p>
      ) : (
        <ul className="space-y-2">
          {data.map((b) => (
            <li key={b.id} className="space-y-2 rounded border border-border bg-surface p-3">
              <p className="font-medium">{b.court_name}</p>
              <p className="text-sm">
                {formatDateTime(b.starts_at)} – {formatDateTime(b.ends_at)}
              </p>
              {b.notes && <p className="text-sm text-muted-foreground">{b.notes}</p>}
              <ReasonForm
                label="Why is the court reopening?"
                submitLabel="Reopen"
                pending={reopen.isPending && reopen.variables?.id === b.id}
                onSubmit={(reason) => reopen.mutate({ id: b.id, reason })}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
