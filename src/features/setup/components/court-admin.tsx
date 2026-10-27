'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoading } from '@/components/ui/page-loading';
import { StaffGate, useStaffVenue } from '@/features/staff';
import { errorMessage } from '@/lib/api-error';
import { useAdminCourts, useCreateCourt, useUpdateCourt } from '../hooks/use-setup';
import type { Court } from '../schemas';

export function CourtAdmin() {
  return (
    <StaffGate permission="COURT:Manage">
      <Courts />
    </StaffGate>
  );
}

function Courts() {
  const { venueId, isPending, error: venueError } = useStaffVenue();
  if (venueId === null) {
    if (venueError) return <Alert tone="error">{errorMessage(venueError)}</Alert>;
    return isPending ? <PageLoading /> : <p className="text-muted-foreground">No venues yet.</p>;
  }
  // Keyed so a venue switch drops the form and edit state.
  return <VenueCourts key={venueId} venueId={venueId} />;
}

/** A whole number, or null (blank included), which disables submit. */
function parseOrder(raw: string): number | null {
  return /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : null;
}

function VenueCourts({ venueId }: { venueId: number }) {
  const { data, error } = useAdminCourts(venueId);
  const create = useCreateCourt(venueId);
  const update = useUpdateCourt(venueId);
  const [name, setName] = useState('');
  const [order, setOrder] = useState('0');
  const [editingId, setEditingId] = useState<number | null>(null);

  const orderValue = parseOrder(order);
  const courts = [...(data?.data ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (orderValue === null) return;
    create.mutate(
      { name: name.trim(), sort_order: orderValue },
      {
        onSuccess: () => {
          setName('');
          setOrder('0');
        },
      },
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Courts</h1>
      </div>
      <form onSubmit={add} className="grid gap-3 rounded border border-border bg-surface p-3">
        <div className="space-y-1">
          <Label htmlFor="court-name">Name</Label>
          <Input id="court-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="court-order">Sort order</Label>
          <Input
            id="court-order"
            inputMode="numeric"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          loading={create.isPending}
          disabled={!name.trim() || orderValue === null}
        >
          Add court
        </Button>
      </form>
      {create.isError && <Alert tone="error">{errorMessage(create.error)}</Alert>}
      {update.isError && <Alert tone="error">{errorMessage(update.error)}</Alert>}
      {!data ? (
        error ? (
          <Alert tone="error">{errorMessage(error)}</Alert>
        ) : (
          <PageLoading />
        )
      ) : courts.length === 0 ? (
        <p className="text-muted-foreground">No courts at this venue yet.</p>
      ) : (
        <ul className="space-y-2">
          {courts.map((c) => (
            <li key={c.id} className="rounded border border-border bg-surface p-3">
              {editingId === c.id ? (
                <EditCourt
                  court={c}
                  pending={update.isPending}
                  onCancel={() => setEditingId(null)}
                  onSave={(body) =>
                    update.mutate({ id: c.id, body }, { onSuccess: () => setEditingId(null) })
                  }
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    <span data-testid="court-name">{c.name}</span>
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      Order {c.sort_order}
                    </span>
                    {!c.is_active && (
                      <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs">Inactive</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/staff/courts/${c.id}/pricing`}
                      aria-label={`Prices for ${c.name}`}
                      className="inline-flex h-8 items-center rounded border border-border bg-surface px-3 text-sm font-medium hover:bg-muted"
                    >
                      Prices
                    </Link>
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`Edit ${c.name}`}
                      onClick={() => setEditingId(c.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={update.isPending}
                      aria-label={`${c.is_active ? 'Deactivate' : 'Activate'} ${c.name}`}
                      onClick={() => update.mutate({ id: c.id, body: { is_active: !c.is_active } })}
                    >
                      {c.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EditCourt({
  court,
  pending,
  onSave,
  onCancel,
}: {
  court: Court;
  pending: boolean;
  onSave: (body: { name: string; sort_order: number }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(court.name);
  const [order, setOrder] = useState(String(court.sort_order));
  const orderValue = parseOrder(order);
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (orderValue !== null) onSave({ name: name.trim(), sort_order: orderValue });
      }}
    >
      <Input
        aria-label={`${court.name} name`}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        aria-label={`${court.name} sort order`}
        inputMode="numeric"
        value={order}
        onChange={(e) => setOrder(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          loading={pending}
          disabled={!name.trim() || orderValue === null}
        >
          Save
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
