'use client';

import { useState } from 'react';
import { notify } from '@/components/ui/snackbar';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageLoading } from '@/components/ui/page-loading';
import { Pill } from '@/components/ui/pill';
import { errorMessage } from '@/lib/api-error';
import { useGroupMutations, useMembers } from '../hooks/use-groups';
import type { Group, Member } from '../schemas';

/**
 * Who is in the group. People are added by exact email — the picker finds
 * one person and never lists anyone else (ADR 0003). A customer added here
 * becomes staff and stays a customer.
 */
export function MemberPanel({ group, readOnly }: { group: Group; readOnly: boolean }) {
  const { data, error, isPending } = useMembers(group.id);
  const { addMember } = useGroupMutations();
  const [email, setEmail] = useState('');
  const [addError, setAddError] = useState<unknown>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setAddError(null);
    addMember.mutate(
      { id: group.id, email: trimmed },
      {
        onSuccess: (m) => {
          setEmail('');
          notify.success(`${m.first_name} ${m.last_name} added to ${group.name}.`);
        },
        onError: setAddError,
      },
    );
  }

  return (
    <div className="space-y-4">
      {!readOnly && (
        <form onSubmit={add} className="space-y-2">
          <label htmlFor={`add-${group.id}`} className="text-sm font-medium">
            Add by email
          </label>
          <div className="flex gap-2">
            <Input
              id={`add-${group.id}`}
              type="email"
              autoComplete="off"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setAddError(null);
              }}
              aria-invalid={addError ? true : undefined}
              aria-describedby={`add-${group.id}-help`}
            />
            <Button type="submit" loading={addMember.isPending} disabled={!email.trim()}>
              Add
            </Button>
          </div>
          <p id={`add-${group.id}-help`} className="text-xs text-muted-foreground">
            Their exact email — customers too. Anyone added keeps their own account.
          </p>
          {addError ? <Alert tone="error">{errorMessage(addError)}</Alert> : null}
        </form>
      )}
      {error && !data ? (
        <Alert tone="error">{errorMessage(error)}</Alert>
      ) : isPending ? (
        <PageLoading label="Loading members" />
      ) : data.data.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nobody is in this group yet.
        </p>
      ) : (
        <ul
          aria-label={`Members of ${group.name}`}
          className="divide-y divide-border rounded-lg border border-border"
        >
          {data.data.map((m) => (
            <MemberRow key={m.user_id} group={group} member={m} readOnly={readOnly} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MemberRow({
  group,
  member,
  readOnly,
}: {
  group: Group;
  member: Member;
  readOnly: boolean;
}) {
  const { removeMember } = useGroupMutations();
  const [confirming, setConfirming] = useState(false);
  const name = `${member.first_name} ${member.last_name}`;
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <Avatar first={member.first_name} last={member.last_name} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="block truncate text-sm text-muted-foreground">{member.email}</span>
      </span>
      {(member.is_customer || member.pending_invite) && (
        <span className="flex flex-wrap gap-1.5">
          {member.pending_invite && <Pill tone="outline">Invite pending</Pill>}
          {member.is_customer && <Pill>Also a customer</Pill>}
        </span>
      )}
      {!readOnly &&
        (confirming ? (
          <span className="flex items-center gap-2">
            <span className="text-sm">Remove {member.first_name}?</span>
            <Button
              variant="primary"
              size="sm"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              loading={removeMember.isPending}
              onClick={() =>
                removeMember.mutate(
                  { id: group.id, userId: member.user_id },
                  {
                    onSuccess: () => notify.success(`${name} removed from ${group.name}.`),
                    onError: (err) => {
                      setConfirming(false);
                      notify.error(errorMessage(err));
                    },
                  },
                )
              }
            >
              Remove
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </span>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Remove ${name}`}
            onClick={() => setConfirming(true)}
          >
            Remove
          </Button>
        ))}
    </li>
  );
}
