'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { StaffGate, useStaffVenue } from '@/features/staff';
import { errorMessage } from '@/lib/api-error';
import { useGroups } from '../hooks/use-groups';
import type { Group } from '../schemas';
import { GroupWorkspace } from './group-workspace';

/**
 * Masters → User groups, the owner's page (ADR 0003): who is a customer, and
 * who is master of each venue and what masters may do. Gated on an
 * owner-only code, so no venue master ever reaches it.
 */
export function UserGroups() {
  return (
    <StaffGate permission="VENUE:Manage">
      <UserGroupsScreen />
    </StaffGate>
  );
}

function UserGroupsScreen() {
  const customers = useGroups({ kind: 'CUSTOMER' });
  const masters = useGroups({ kind: 'MASTER' });
  const { venues } = useStaffVenue();
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const venueName = (id: number | null) => venues.find((v) => v.venue_id === id)?.name ?? 'Venue';
  const titleFor = (g: Group) =>
    g.kind === 'MASTER' ? `Venue master · ${venueName(g.venue_id)}` : g.name;
  const all = [...(customers.data?.data ?? []), ...(masters.data?.data ?? [])];
  const term = filter.trim().toLowerCase();
  const shown = term ? all.filter((g) => titleFor(g).toLowerCase().includes(term)) : all;
  const error = customers.error ?? masters.error;

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Masters / User groups
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">User groups</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Who can book as a customer, and who runs each venue. Each venue’s masters manage their own
          staff from Venue staff.
        </p>
      </header>
      {error && !customers.data ? (
        <Alert tone="error">{errorMessage(error)}</Alert>
      ) : !customers.data || !masters.data ? (
        <div
          aria-hidden
          className="h-72 animate-pulse rounded-md bg-muted motion-reduce:animate-none"
        />
      ) : (
        <GroupWorkspace
          groups={shown}
          listLabel="Customer and venue master groups"
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
          readOnlyFor={(g) => g.read_only}
          titleFor={titleFor}
          tagFor={(g) => (g.kind === 'CUSTOMER' ? 'All venues' : null)}
          empty={
            <div>
              <label htmlFor="group-filter" className="sr-only">
                Filter groups
              </label>
              <Input
                id="group-filter"
                type="search"
                placeholder="Filter by venue"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          }
        />
      )}
    </section>
  );
}
