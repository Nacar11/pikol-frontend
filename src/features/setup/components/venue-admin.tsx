'use client';

import { MapPin, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoading } from '@/components/ui/page-loading';
import { usePermissions } from '@/features/auth';
import type { Venue } from '@/features/catalog';
import { StaffGate } from '@/features/staff';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/api-error';
import { manilaToday } from '@/lib/manila';
import { DAY_HOURS, bookedHours } from '../booked-hours';
import {
  useAdminCourts,
  useAdminVenues,
  useCreateVenue,
  useUpdateVenue,
  useVenueDayBookings,
} from '../hooks/use-setup';

export function VenueAdmin() {
  return (
    <StaffGate permission="VENUE:Manage">
      <Venues />
    </StaffGate>
  );
}

function Venues() {
  const permissions = usePermissions().data ?? [];
  const [today] = useState(() => manilaToday());
  const { data, error } = useAdminVenues();
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
        description={
          data
            ? `${active} active${inactive > 0 ? ` · ${inactive} inactive` : ''} · Each venue has its own courts, prices and staff`
            : 'Each venue has its own courts, prices and staff'
        }
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden className="size-4" />
            Add venue
          </Button>
        }
      />
      {create.isError && <Alert tone="error">{errorMessage(create.error)}</Alert>}
      {update.isError && <Alert tone="error">{errorMessage(update.error)}</Alert>}
      {!data ? (
        error ? (
          <Alert tone="error">{errorMessage(error)}</Alert>
        ) : (
          <PageLoading />
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {venues.map((v) => (
            <VenueCard
              key={v.id}
              venue={v}
              today={today}
              canCourts={permissions.includes('COURT:Manage')}
              canBookings={permissions.includes('BOOKING:ReadAny')}
              editing={editingId === v.id}
              onEdit={(on) => setEditingId(on ? v.id : null)}
              onSave={(body) =>
                update.mutate({ id: v.id, body }, { onSuccess: () => setEditingId(null) })
              }
              saving={update.isPending}
              onToggleActive={() => update.mutate({ id: v.id, body: { is_active: !v.is_active } })}
            />
          ))}
          <AddVenueTile
            adding={adding}
            onAdding={setAdding}
            pending={create.isPending}
            onCreate={(body) => create.mutate(body, { onSuccess: () => setAdding(false) })}
          />
        </ul>
      )}
    </section>
  );
}

function VenueCard({
  venue,
  today,
  canCourts,
  canBookings,
  editing,
  onEdit,
  onSave,
  saving,
  onToggleActive,
}: {
  venue: Venue;
  today: string;
  canCourts: boolean;
  canBookings: boolean;
  editing: boolean;
  onEdit: (on: boolean) => void;
  onSave: (body: { name: string; address: string | null }) => void;
  saving: boolean;
  onToggleActive: () => void;
}) {
  const courts = useAdminCourts(canCourts ? venue.id : null);
  const day = useVenueDayBookings(venue.id, today, canBookings && venue.is_active);
  const activeCourts = courts.data?.data.filter((c) => c.is_active).length;
  const booked = day.data
    ? [...bookedHours(day.data.data, today).values()].reduce((a, b) => a + b, 0)
    : undefined;
  const capacity = activeCourts === undefined ? undefined : activeCourts * DAY_HOURS;

  return (
    <li className="flex flex-col rounded-lg border border-border bg-surface">
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <span
            aria-hidden
            className={cn(
              'inline-flex size-12 items-center justify-center rounded border border-foreground',
              !venue.is_active && 'border-input text-muted-foreground',
            )}
          >
            <MapPin className="size-5" />
          </span>
          <span
            className={cn(
              'rounded px-2 py-0.5 text-xs font-medium',
              venue.is_active ? 'bg-muted' : 'border border-dashed border-input',
            )}
          >
            {venue.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        {editing ? (
          <EditVenue
            venue={venue}
            pending={saving}
            onSave={onSave}
            onCancel={() => onEdit(false)}
          />
        ) : (
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-xl font-semibold tracking-tight">{venue.name}</h2>
            <p className="truncate text-sm text-muted-foreground">
              {venue.address ?? 'No address'}
            </p>
          </div>
        )}
      </div>

      <dl className="grid grid-cols-2 border-y border-border">
        <div className="space-y-1 border-r border-border p-4">
          <dt className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Courts
          </dt>
          <dd className="text-lg font-semibold tabular-nums">
            {activeCourts === undefined ? '—' : `${activeCourts} active`}
          </dd>
        </div>
        <div className="space-y-1 p-4">
          <dt className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Booked today
          </dt>
          <dd className="text-lg font-semibold tabular-nums">
            {booked === undefined ? '—' : `${booked} h`}
          </dd>
          {booked !== undefined && capacity !== undefined && capacity > 0 && (
            <div aria-hidden className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-foreground"
                style={{ width: `${Math.min(100, (booked / capacity) * 100)}%` }}
              />
            </div>
          )}
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap gap-2 p-4">
        {canCourts && (
          <Link
            href={`/staff/courts?venue=${venue.id}`}
            aria-label={`Courts at ${venue.name}`}
            className="inline-flex h-8 items-center rounded border border-border bg-surface px-3 text-sm font-medium hover:bg-muted"
          >
            Courts
          </Link>
        )}
        <Button
          variant="secondary"
          size="sm"
          aria-label={`Edit ${venue.name}`}
          disabled={editing}
          onClick={() => onEdit(true)}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={saving}
          aria-label={`${venue.is_active ? 'Deactivate' : 'Activate'} ${venue.name}`}
          onClick={onToggleActive}
        >
          {venue.is_active ? 'Deactivate' : 'Activate'}
        </Button>
      </div>
    </li>
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
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      />
      <Input
        aria-label={`${venue.name} address`}
        placeholder="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
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

function AddVenueTile({
  adding,
  onAdding,
  pending,
  onCreate,
}: {
  adding: boolean;
  onAdding: (on: boolean) => void;
  pending: boolean;
  onCreate: (body: { name: string; address?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const hint = 'Created with a Venue master and a Front desk group';
  return (
    <li className="min-h-72 rounded-lg border border-dashed border-input">
      {adding ? (
        <form
          className="flex h-full flex-col justify-center gap-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = address.trim();
            if (name.trim())
              onCreate({ name: name.trim(), ...(trimmed ? { address: trimmed } : {}) });
          }}
          onKeyDown={(e) => e.key === 'Escape' && onAdding(false)}
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
          <p className="text-sm text-muted-foreground">{hint}</p>
          <div className="flex gap-2">
            <Button type="submit" loading={pending} disabled={!name.trim()}>
              Create venue
            </Button>
            <Button type="button" variant="ghost" onClick={() => onAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => onAdding(true)}
          className="flex size-full min-h-72 flex-col items-center justify-center gap-3 rounded-lg p-5 transition-colors duration-150 hover:bg-muted/60"
        >
          <span
            aria-hidden
            className="inline-flex size-12 items-center justify-center rounded border border-foreground"
          >
            <Plus className="size-5" />
          </span>
          <span className="font-semibold">Add venue</span>
          <span className="text-sm text-muted-foreground">{hint}</span>
        </button>
      )}
    </li>
  );
}
