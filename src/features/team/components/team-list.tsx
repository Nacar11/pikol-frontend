'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageLoading } from '@/components/ui/page-loading';
import { useAuth } from '@/features/auth';
import { StaffGate } from '@/features/staff';
import { errorMessage } from '@/lib/api-error';
import { useResendInvitation, useRevokeInvitation, useSetActive, useTeam } from '../hooks/use-team';
import { ROLE_LABELS, type User } from '../schemas';
import { InviteForm } from './invite-form';

export function TeamList() {
  return (
    <StaffGate permission="USER:Manage">
      <Team />
    </StaffGate>
  );
}

function statusOf(u: User): string {
  if (u.email_verified_at === null) return 'Invited';
  return u.is_active ? 'Active' : 'Deactivated';
}

function Team() {
  const { user: me } = useAuth();
  const { data, error, hasNextPage, fetchNextPage, isFetchingNextPage } = useTeam();
  const setActive = useSetActive();
  const resend = useResendInvitation();
  const revoke = useRevokeInvitation();

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

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Staff</h1>
      <InviteForm />
      {/* List level: a refetch can drop the row this outcome is about. */}
      {outcome && <Alert tone={outcome.tone}>{outcome.message}</Alert>}
      {error && <Alert tone="error">{errorMessage(error)}</Alert>}
      {!data ? (
        error ? null : (
          <PageLoading />
        )
      ) : (
        <ul className="space-y-2">
          {data.pages
            .flatMap((p) => p.data)
            .map((u) => {
              const name = `${u.first_name} ${u.last_name}`;
              return (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-surface p-3"
                >
                  <div>
                    <p className="font-medium">{name}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                    <p className="text-sm">
                      {ROLE_LABELS[u.role]} · {statusOf(u)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {u.email_verified_at === null ? (
                      <>
                        <Button
                          variant="secondary"
                          aria-label={`Resend invitation to ${name}`}
                          onClick={() => run(resend, u.id, `Invitation resent to ${u.email}.`)}
                        >
                          Resend
                        </Button>
                        <Button
                          variant="secondary"
                          aria-label={`Revoke invitation for ${name}`}
                          onClick={() => run(revoke, u.id)}
                        >
                          Revoke
                        </Button>
                      </>
                    ) : u.id === me?.id ? null : (
                      <Button
                        variant="secondary"
                        aria-label={`${u.is_active ? 'Deactivate' : 'Reactivate'} ${name}`}
                        onClick={() => run(setActive, { id: u.id, is_active: !u.is_active })}
                      >
                        {u.is_active ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
        </ul>
      )}
      {hasNextPage && (
        <Button variant="secondary" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
          Load more
        </Button>
      )}
    </section>
  );
}
