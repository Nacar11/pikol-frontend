'use client';

import { MapPin, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoading } from '@/components/ui/page-loading';
import { Pill } from '@/components/ui/pill';
import { usePermissions } from '@/features/auth';
import type { Venue } from '@/features/catalog';
import { StaffGate } from '@/features/staff';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/api-error';
import {
  useAdminVenues,
  useCreateVenue,
  useUpdateVenue,
  useVenueSummaries,
} from '../hooks/use-setup';
import type { VenueCreate, VenueSummary } from '../schemas';
import { AddCard, SetupCard } from './setup-card';

const DAY_HOURS = 24;
const ADD_HINT = 'Created with a Venue master and a Front desk group';

export function VenueAdmin() {
  return (
    <StaffGate permission="VENUE:Manage">
      <Venues />
    </StaffGate>
  );
}

function Venues() {
  const canCourts = (usePermissions().data ?? []).includes('COURT:Manage');
  const { data, error } = useAdminVenues();
  const summaries = useVenueSummaries();
  const create = useCreateVenue();
  const update = useUpdateVenue();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const venues = data?.data ?? [];
  const active = venues.filter((v) => v.is_active).length;
  const inactive = venues.length - active;

  return (
    <section className="space-y-8">
      <PageHeader
        section="Setup"
        title="Venues"
        description={`${data ? `${active} active${inactive > 0 ? ` · ${inactive} inactive` : ''} · ` : ''}Each venue has its own courts, prices and staff`}
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden className="size-4" />
            Add venue
          </Button>
        }
      />
      {[create, update].map(
        (m, i) =>
          m.isError && (
            <Alert key={i} tone="error">
              {errorMessage(m.error)}
            </Alert>
          ),
      )}
      {!data ? (
        error ? (
          <Alert tone="error">{errorMessage(error)}</Alert>
        ) : (
          <PageLoading />
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {venues.map((v) => (
            <SetupCard
              key={v.id}
              head={
                <>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      aria-hidden
                      className={cn(
                        'inline-flex size-12 items-center justify-center rounded border border-foreground',
                        !v.is_active && 'border-input text-muted-foreground',
                      )}
                    >
                      <MapPin className="size-5" />
                    </span>
                    <Pill tone={v.is_active ? 'solid' : 'dashed'}>
                      {v.is_active ? 'Active' : 'Inactive'}
                    </Pill>
                  </div>
                  {editingId === v.id ? (
                    <EditVenue
                      venue={v}
                      pending={update.isPending}
                      onSave={(body) =>
                        update.mutate({ id: v.id, body }, { onSuccess: () => setEditingId(null) })
                      }
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="min-w-0 space-y-1">
                      <h2 className="truncate text-xl font-semibold tracking-tight">{v.name}</h2>
                      <p className="truncate text-sm text-muted-foreground">
                        {v.address ?? 'No address'}
                      </p>
                    </div>
                  )}
                </>
              }
              stats={venueStats(
                v,
                summaries.data?.find((s) => s.venue_id === v.id),
              )}
              actions={
                <>
                  {canCourts && (
                    <Link
                      href={`/staff/courts?venue=${v.id}`}
                      aria-label={`Courts at ${v.name}`}
                      className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                    >
                      Courts
                    </Link>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Edit ${v.name}`}
                    disabled={editingId === v.id}
                    onClick={() => setEditingId(v.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={update.isPending}
                    aria-label={`${v.is_active ? 'Deactivate' : 'Activate'} ${v.name}`}
                    onClick={() => update.mutate({ id: v.id, body: { is_active: !v.is_active } })}
                  >
                    {v.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </>
              }
            />
          ))}
          <AddCard title="Add venue" hint={ADD_HINT} open={adding} onOpen={() => setAdding(true)}>
            <NewVenueForm
              pending={create.isPending}
              onCancel={() => setAdding(false)}
              onCreate={(body) => create.mutate(body, { onSuccess: () => setAdding(false) })}
            />
          </AddCard>
        </ul>
      )}
    </section>
  );
}

function venueStats(venue: Venue, summary: VenueSummary | undefined) {
  const courts = summary?.active_courts;
  const booked = venue.is_active ? summary?.booked_hours : undefined;
  return [
    { label: 'Courts', value: courts === undefined ? '—' : `${courts} active` },
    {
      label: 'Booked today',
      value: booked === undefined ? '—' : `${booked} h`,
      meter: booked !== undefined && courts ? booked / (courts * DAY_HOURS) : undefined,
    },
  ];
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
  const escape = (e: React.KeyboardEvent) => e.key === 'Escape' && onCancel();
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name: name.trim(), address: address.trim() || null });
      }}
    >
      <Input
        aria-label={`${venue.name} name`}
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={escape}
      />
      <Input
        aria-label={`${venue.name} address`}
        placeholder="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        onKeyDown={escape}
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

function NewVenueForm({
  pending,
  onCreate,
  onCancel,
}: {
  pending: boolean;
  onCreate: (body: VenueCreate) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = address.trim();
        if (name.trim()) onCreate({ name: name.trim(), ...(trimmed ? { address: trimmed } : {}) });
      }}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
      <div className="space-y-1">
        <Label htmlFor="venue-name">Name</Label>
        <Input
          id="venue-name"
          autoFocus
          placeholder="e.g. Pikol - Minglanilla"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="venue-address">Address</Label>
        <Input
          id="venue-address"
          placeholder="Optional"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <p className="text-sm text-muted-foreground">{ADD_HINT}</p>
      <div className="flex gap-2">
        <Button type="submit" loading={pending} disabled={!name.trim()}>
          Create venue
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
