'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePermissions } from '@/features/auth';
import { useGroups } from '@/features/groups';
import { useStaffVenue } from '@/features/staff';
import { errorCode, errorMessage } from '@/lib/api-error';
import { useInvite } from '../hooks/use-team';

const SELECT_CLASS = 'h-10 w-full rounded border border-input bg-surface px-3 text-sm';

type Fields = { email: string; first_name: string; last_name: string; mobile: string };
const EMPTY: Fields = { email: '', first_name: '', last_name: '', mobile: '' };

/**
 * Invite someone new into one group at the active venue (ADR 0003). Only the
 * owner is offered the venue's master group, and only the owner's invite
 * goes to /admin/users; nobody's form has a venue or role field.
 */
export function InviteForm({
  onSent,
  onCancel,
}: { onSent?: () => void; onCancel?: () => void } = {}) {
  const isOwner = (usePermissions().data ?? []).includes('VENUE:Manage');
  const { venueId, venue } = useStaffVenue();
  const groups = useGroups({ venue_id: venueId ?? undefined }, venueId !== null);
  const choices = (groups.data?.data ?? []).filter(
    (g) => g.kind === 'STAFF' || (isOwner && g.kind === 'MASTER'),
  );
  const invite = useInvite();
  const [f, setF] = useState<Fields>(EMPTY);
  const [groupId, setGroupId] = useState('');
  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));
  const ready =
    f.email.trim() !== '' &&
    f.first_name.trim() !== '' &&
    f.last_name.trim() !== '' &&
    groupId !== '';
  const exists = invite.isError && errorCode(invite.error) === 'EMAIL_EXISTS';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const mobile = f.mobile.trim();
        invite.mutate(
          {
            asOwner: isOwner,
            invite: {
              email: f.email.trim(),
              first_name: f.first_name.trim(),
              last_name: f.last_name.trim(),
              ...(mobile ? { mobile } : {}),
              group_id: Number(groupId),
            },
          },
          {
            onSuccess: () => {
              toast.success(`Invitation sent to ${f.email.trim()}`);
              setF(EMPTY);
              setGroupId('');
              onSent?.();
            },
          },
        );
      }}
      className="grid max-w-3xl gap-4 rounded-lg border border-border bg-surface p-5 sm:grid-cols-2"
    >
      <h2 className="font-semibold sm:col-span-2">Invite someone new</h2>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          type="email"
          value={f.email}
          onChange={(e) => {
            set('email')(e);
            invite.reset();
          }}
          aria-invalid={exists || undefined}
          aria-describedby={exists ? 'invite-email-error' : undefined}
        />
        {exists && (
          <p id="invite-email-error" role="alert" className="text-sm text-destructive">
            Already registered —{' '}
            <Link href="/staff/venue-staff" className="font-medium underline">
              add them from Venue staff
            </Link>
            .
          </p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="invite-first">First name</Label>
        <Input id="invite-first" value={f.first_name} onChange={set('first_name')} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="invite-last">Last name</Label>
        <Input id="invite-last" value={f.last_name} onChange={set('last_name')} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="invite-mobile">Mobile (optional)</Label>
        <Input id="invite-mobile" value={f.mobile} onChange={set('mobile')} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="invite-group">Group{venue ? ` at ${venue.name}` : ''}</Label>
        <select
          id="invite-group"
          className={SELECT_CLASS}
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
        >
          <option value="">Choose a group</option>
          {choices.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>
      {invite.isError && !exists && (
        <Alert tone="error" className="sm:col-span-2">
          {errorMessage(invite.error)}
        </Alert>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={invite.isPending} disabled={!ready}>
          Send invitation
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
