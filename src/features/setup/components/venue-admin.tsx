'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoading } from '@/components/ui/page-loading';
import type { Venue } from '@/features/catalog';
import { StaffGate } from '@/features/staff';
import { errorMessage } from '@/lib/api-error';
import { useAdminVenues, useCreateVenue, useUpdateVenue } from '../hooks/use-setup';

export function VenueAdmin() {
  return (
    <StaffGate permission="VENUE:Manage">
      <Venues />
    </StaffGate>
  );
}

function Venues() {
  const { data, error } = useAdminVenues();
  const create = useCreateVenue();
  const update = useUpdateVenue();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    create.mutate(
      { name: name.trim(), ...(trimmed ? { address: trimmed } : {}) },
      {
        onSuccess: () => {
          setName('');
          setAddress('');
        },
      },
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Venues</h1>
      <form onSubmit={add} className="grid gap-3 rounded border border-border bg-surface p-3">
        <div className="space-y-1">
          <Label htmlFor="venue-name">Name</Label>
          <Input id="venue-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="venue-address">Address</Label>
          <Input id="venue-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <Button type="submit" loading={create.isPending} disabled={!name.trim()}>
          Add venue
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
      ) : (
        <ul className="space-y-2">
          {data.data.map((v) => (
            <li key={v.id} className="rounded border border-border bg-surface p-3">
              {editingId === v.id ? (
                <EditVenue
                  venue={v}
                  pending={update.isPending}
                  onCancel={() => setEditingId(null)}
                  onSave={(body) =>
                    update.mutate({ id: v.id, body }, { onSuccess: () => setEditingId(null) })
                  }
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {v.name}
                      {!v.is_active && (
                        <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs">Inactive</span>
                      )}
                    </p>
                    {v.address && <p className="text-sm text-muted-foreground">{v.address}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`Edit ${v.name}`}
                      onClick={() => setEditingId(v.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={update.isPending}
                      aria-label={`${v.is_active ? 'Deactivate' : 'Activate'} ${v.name}`}
                      onClick={() => update.mutate({ id: v.id, body: { is_active: !v.is_active } })}
                    >
                      {v.is_active ? 'Deactivate' : 'Activate'}
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

function EditVenue({
  venue,
  pending,
  onSave,
  onCancel,
}: {
  venue: Venue;
  pending: boolean;
  onSave: (body: { name: string; address: string | null }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(venue.name);
  const [address, setAddress] = useState(venue.address ?? '');
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name: name.trim(), address: address.trim() || null });
      }}
    >
      <Input
        aria-label={`${venue.name} name`}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        aria-label={`${venue.name} address`}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={pending} disabled={!name.trim()}>
          Save
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
