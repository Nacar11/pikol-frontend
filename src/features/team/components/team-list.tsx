'use client';

import { Search, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageLoading } from '@/components/ui/page-loading';
import { Pill } from '@/components/ui/pill';
import { useAuth } from '@/features/auth';
import { StaffGate } from '@/features/staff';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/api-error';
import { useResendInvitation, useRevokeInvitation, useSetActive, useTeam } from '../hooks/use-team';
import { staffGroupsOf, type User } from '../schemas';
import { InviteForm } from './invite-form';

const SEARCH_DEBOUNCE_MS = 300;

export function TeamList() {
  return (
    <StaffGate permission="USER:Manage">
      <Team />
    </StaffGate>
  );
}

type Status = 'Active' | 'Invited' | 'Deactivated';
const FILTERS = ['All', 'Active', 'Invited', 'Deactivated'] as const;
type Filter = (typeof FILTERS)[number];

function statusOf(u: User): Status {
  if (u.email_verified_at === null) return 'Invited';
  return u.is_active ? 'Active' : 'Deactivated';
}

const STATUS_TONE = { Active: 'solid', Invited: 'outline', Deactivated: 'dashed' } as const;

function Team() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [inviting, setInviting] = useState(false);
  const { data, error, hasNextPage, fetchNextPage, isFetchingNextPage } = useTeam(q);
  const setActive = useSetActive();
  const resend = useResendInvitation();
  const revoke = useRevokeInvitation();

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  // Only the latest action's outcome is shown: starting one clears the last.
  const [outcome, setOutcome] = useState<{ tone: 'success' | 'error'; message: string } | null>(
    null,
  );
  function run<T>(mutation: { mutate: (v: T, o: object) => void }, vars: T, success?: string) {
    setOutcome(null);
    mutation.mutate(vars, {
      onSuccess: () => setOutcome(success ? { tone: 'success', message: success } : null),
      onError: (err: unknown) => setOutcome({ tone: 'error', message: errorMessage(err) }),
    });
  }

  const people = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  // Counts are exact only once every page is loaded; until then they would
  // undercount, so they are left off.
  const counted = data !== undefined && !hasNextPage;
  const count = (f: Filter) =>
    f === 'All' ? people.length : people.filter((u) => statusOf(u) === f).length;
  const shown = filter === 'All' ? people : people.filter((u) => statusOf(u) === filter);

  return (
    <section className="space-y-6">
      <PageHeader
        section="Setup"
        title="Staff accounts"
        description={
          data === undefined
            ? undefined
            : counted && !q
              ? `${count('Active')} active`
              : `${total} ${total === 1 ? 'person' : 'people'}`
        }
        action={
          !inviting && (
            <Button onClick={() => setInviting(true)}>
              <UserPlus aria-hidden className="size-4" />
              Invite staff
            </Button>
          )
        }
      />

      {inviting && (
        <InviteForm onSent={() => setInviting(false)} onCancel={() => setInviting(false)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Search name or email"
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div
          role="group"
          aria-label="Status"
          className="flex overflow-hidden rounded border border-border"
        >
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                'inline-flex h-10 items-center gap-1.5 border-l border-border px-3 text-sm transition-colors duration-150 first:border-l-0',
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted',
              )}
            >
              {f}
              {counted && (
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    filter === f ? 'opacity-80' : 'text-muted-foreground',
                  )}
                >
                  {count(f)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List level: a refetch can drop the row this outcome is about. */}
      {outcome && <Alert tone={outcome.tone}>{outcome.message}</Alert>}
      {error && <Alert tone="error">{errorMessage(error)}</Alert>}
      {!data ? (
        error ? null : (
          <PageLoading />
        )
      ) : shown.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {q
            ? `No one matches “${q}”.`
            : filter === 'All'
              ? 'No staff yet.'
              : `No ${filter.toLowerCase()} staff.`}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Person
                </th>
                <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                  Group
                </th>
                <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((u) => {
                const name = `${u.first_name} ${u.last_name}`;
                const status = statusOf(u);
                const groups = staffGroupsOf(u);
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar first={u.first_name} last={u.last_name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{name}</p>
                          <p className="truncate text-muted-foreground">{u.email}</p>
                          {/* The hidden columns, folded in on narrow screens. */}
                          <p className="text-muted-foreground md:hidden">
                            {groups} · {status}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">{groups}</td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Pill tone={STATUS_TONE[status]}>{status}</Pill>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {u.email_verified_at === null ? (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              aria-label={`Resend invitation to ${name}`}
                              onClick={() => run(resend, u.id, `Invitation resent to ${u.email}.`)}
                            >
                              Resend
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Revoke invitation for ${name}`}
                              onClick={() => run(revoke, u.id)}
                            >
                              Revoke
                            </Button>
                          </>
                        ) : u.id === me?.id ? (
                          <span className="text-xs text-muted-foreground">You</span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`${u.is_active ? 'Deactivate' : 'Reactivate'} ${name}`}
                            onClick={() => run(setActive, { id: u.id, is_active: !u.is_active })}
                          >
                            {u.is_active ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {hasNextPage && (
        <Button variant="secondary" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
          Load more
        </Button>
      )}
    </section>
  );
}
