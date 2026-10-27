'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { AddTile } from '@/components/ui/add-tile';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
  const [creating, setCreating] = useState(false);
  const list = groups.data?.data ?? [];
  const onlyDefaults = list.filter((g) => g.kind === 'STAFF').length <= 1;

  return (
    <section className="space-y-8">
      <PageHeader
        section="Setup"
        title="Venue staff"
        description={
          groups.data && venue
            ? `${list.length} ${list.length === 1 ? 'group' : 'groups'} at ${venue.name} · A group decides what its members can do here`
            : 'A group decides what its members can do here'
        }
        action={
          venueId !== null &&
          !creating && (
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden className="size-4" />
              New group
            </Button>
          )
        }
      />
      {groups.error && !groups.data ? (
        <Alert tone="error">{errorMessage(groups.error)}</Alert>
      ) : !groups.data || venueId === null ? (
        <Skeleton />
      ) : (
        <GroupWorkspace
          groups={list}
          listLabel="Groups at this venue"
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
          readOnlyFor={(g) => g.kind === 'MASTER' || g.read_only}
          tagFor={(g) => (g.kind === 'MASTER' ? 'Managed by the owner' : null)}
          empty={
            <>
              <NewGroupTile
                venueId={venueId}
                open={creating}
                onOpen={setCreating}
                onCreated={setSelectedId}
              />
              {onlyDefaults && (
                <p className="text-sm text-muted-foreground">
                  Make one group per role — “Weekend crew”, “Cashier” — tick its permissions, then
                  add people by email.
                </p>
              )}
            </>
          }
        />
      )}
    </section>
  );
}

/** The dashed "add" tile under the list, as on Courts and Venues. */
function NewGroupTile({
  venueId,
  open,
  onOpen,
  onCreated,
}: {
  venueId: number;
  open: boolean;
  onOpen: (open: boolean) => void;
  onCreated: (id: number) => void;
}) {
  const { data: permissions } = usePermissions();
  const { create } = useGroupMutations();
  const [name, setName] = useState('');
  const [error, setError] = useState<unknown>(null);
  // Only the owner names the venue; for anyone else the server takes the
  // venue they are acting at, and refuses a body that names one.
  const isOwner = permissions?.includes('VENUE:Manage') ?? false;

  if (!open) {
    return (
      <AddTile
        size="sm"
        title="New group"
        hint="One per role, with its own permissions"
        onClick={() => onOpen(true)}
      />
    );
  }
  return (
    <form
      className="space-y-3 rounded-lg border border-dashed border-input p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        create.mutate(
          { name: name.trim(), ...(isOwner ? { venue_id: venueId } : {}) },
          {
            onSuccess: (g) => {
              onOpen(false);
              setName('');
              onCreated(g.id);
            },
            onError: setError,
          },
        );
      }}
      onKeyDown={(e) => e.key === 'Escape' && onOpen(false)}
    >
      <label htmlFor="new-group" className="text-sm font-medium">
        New group name
      </label>
      <Input
        id="new-group"
        autoFocus
        maxLength={64}
        placeholder="e.g. Weekend crew"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" loading={create.isPending} disabled={!name.trim()}>
          Create
        </Button>
        <Button type="button" variant="ghost" onClick={() => onOpen(false)}>
          Cancel
        </Button>
      </div>
      {error ? <Alert tone="error">{errorMessage(error)}</Alert> : null}
    </form>
  );
}
