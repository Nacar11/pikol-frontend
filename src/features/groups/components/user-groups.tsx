'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
    <section className="space-y-8">
      <PageHeader
        section="Masters"
        title="User groups"
        description="Who can book as a customer, and who runs each venue. Each venue’s masters manage their own staff from Venue staff."
      />
      {error && !customers.data ? (
        <Alert tone="error">{errorMessage(error)}</Alert>
      ) : !customers.data || !masters.data ? (
        <Skeleton />
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
