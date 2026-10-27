'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/features/auth';
import { StaffGate, useStaffVenue } from '@/features/staff';
import { errorMessage } from '@/lib/api-error';
import { useGroupMutations, useGroups } from '../hooks/use-groups';
import { GroupWorkspace } from './group-workspace';

/** Setup → Venue staff: a venue master's own groups at the active venue
 * (ADR 0003). The master group is listed for reference, read-only — the
 * owner manages it from Masters → User groups. */
export function VenueStaff() {
  return (
    <StaffGate permission="USER:Manage">
      <VenueStaffScreen />
    </StaffGate>
  );
}

function VenueStaffScreen() {
  const { venueId, venue } = useStaffVenue();
  const groups = useGroups({ venue_id: venueId ?? undefined }, venueId !== null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const list = groups.data?.data ?? [];
  const onlyDefaults = list.filter((g) => g.kind === 'STAFF').length <= 1;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Setup / Venue staff{venue ? ` / ${venue.name}` : ''}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Venue staff</h1>
        </div>
        {venueId !== null && <NewGroup venueId={venueId} onCreated={setSelectedId} />}
      </header>
      {groups.error && !groups.data ? (
        <Alert tone="error">{errorMessage(groups.error)}</Alert>
      ) : !groups.data ? (
        <div
          aria-hidden
          className="h-72 animate-pulse rounded-md bg-muted motion-reduce:animate-none"
        />
      ) : (
        <GroupWorkspace
          groups={list}
          listLabel="Groups at this venue"
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
          readOnlyFor={(g) => g.kind === 'MASTER' || g.read_only}
          tagFor={(g) => (g.kind === 'MASTER' ? 'Managed by the owner' : null)}
          empty={
            onlyDefaults ? (
              <p className="text-sm text-muted-foreground">
                Groups decide what your staff can do here. Make one per role — “Weekend crew”,
                “Cashier” — tick its permissions, then add people by email.
              </p>
            ) : null
          }
        />
      )}
    </section>
  );
}

function NewGroup({ venueId, onCreated }: { venueId: number; onCreated: (id: number) => void }) {
  const { data: permissions } = usePermissions();
  const { create } = useGroupMutations();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<unknown>(null);
  // Only the owner names the venue; for anyone else the server takes the
  // venue they are acting at, and refuses a body that names one.
  const isOwner = permissions?.includes('VENUE:Manage') ?? false;

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden className="size-4" />
        New group
      </Button>
    );
  }
  return (
    <form
      className="flex w-full flex-wrap items-start gap-2 sm:w-auto"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        create.mutate(
          { name: name.trim(), ...(isOwner ? { venue_id: venueId } : {}) },
          {
            onSuccess: (g) => {
              setOpen(false);
              setName('');
              onCreated(g.id);
            },
            onError: setError,
          },
        );
      }}
    >
      <label htmlFor="new-group" className="sr-only">
        New group name
      </label>
      <Input
        id="new-group"
        autoFocus
        maxLength={64}
        placeholder="Group name, e.g. Weekend crew"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="sm:w-64"
      />
      <Button type="submit" loading={create.isPending} disabled={!name.trim()}>
        Create
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {error ? (
        <div className="w-full">
          <Alert tone="error">{errorMessage(error)}</Alert>
        </div>
      ) : null}
    </form>
  );
}
