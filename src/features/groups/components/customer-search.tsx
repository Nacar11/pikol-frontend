'use client';

import { useDeferredValue, useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { errorMessage } from '@/lib/api-error';
import { useGroupMutations, useUserSearch } from '../hooks/use-groups';
import type { Group } from '../schemas';

/** The owner's search over every account, to make someone a customer or
 * stop them booking — without deleting their account (ADR 0003). */
export function CustomerSearch({ group }: { group: Group }) {
  const [q, setQ] = useState('');
  const term = useDeferredValue(q);
  const { data, error, isFetching } = useUserSearch(term);
  const { addMember, removeMember } = useGroupMutations();
  const [changed, setChanged] = useState<Record<number, boolean>>({});

  return (
    <div className="space-y-3">
      <label htmlFor="customer-search" className="text-sm font-medium">
        Find a person
      </label>
      <Input
        id="customer-search"
        type="search"
        placeholder="Name or email"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {error ? <Alert tone="error">{errorMessage(error)}</Alert> : null}
      {term.trim().length >= 2 && data && (
        <ul
          aria-label="People found"
          aria-busy={isFetching}
          className="divide-y divide-border rounded-md border border-border"
        >
          {data.data.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">Nobody matches “{term}”.</li>
          ) : (
            data.data.map((u) => {
              const name = `${u.first_name} ${u.last_name}`;
              const customer = changed[u.id] ?? u.groups.some((g) => g.kind === 'CUSTOMER');
              return (
                <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {u.email} · {customer ? 'Customer' : 'Not a customer'}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={`${customer ? 'Remove' : 'Add'} ${name} ${customer ? 'from' : 'to'} customers`}
                    onClick={() => {
                      const onSuccess = () => {
                        setChanged((c) => ({ ...c, [u.id]: !customer }));
                        toast.success(
                          `${name} ${customer ? 'can no longer book' : 'can now book'}.`,
                        );
                      };
                      const onError = (err: unknown) => toast.error(errorMessage(err));
                      if (customer)
                        removeMember.mutate({ id: group.id, userId: u.id }, { onSuccess, onError });
                      else
                        addMember.mutate({ id: group.id, email: u.email }, { onSuccess, onError });
                    }}
                  >
                    {customer ? 'Remove' : 'Add'}
                  </Button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
