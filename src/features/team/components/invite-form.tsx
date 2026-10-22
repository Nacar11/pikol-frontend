'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePermissions } from '@/features/auth';
import { useVenues } from '@/features/catalog';
import { errorMessage } from '@/lib/api-error';
import { useInviteAny, useInviteStaff } from '../hooks/use-team';
import type { AnyInvite } from '../schemas';

const SELECT_CLASS = 'h-10 w-full rounded border border-border bg-surface px-3 text-sm';

/** Whoever holds `VENUE:Manage` (the owner) chooses role and venue and posts
 * `/admin/users`. Everyone else's form has neither field and posts
 * `/admin/venue-staff`: it cannot express a privilege (spec §6.4). */
export function InviteForm() {
  const canChoose = (usePermissions().data ?? []).includes('VENUE:Manage');
  return canChoose ? <OwnerInvite /> : <ManagerInvite />;
}

type Fields = { email: string; first_name: string; last_name: string; mobile: string };
const EMPTY: Fields = { email: '', first_name: '', last_name: '', mobile: '' };

function ManagerInvite() {
  const invite = useInviteStaff();
  return (
    <InviteFields
      pending={invite.isPending}
      error={invite.isError ? errorMessage(invite.error) : null}
      canSubmit={() => true}
      onSubmit={(f, done) => {
        const mobile = f.mobile.trim();
        invite.mutate(
          {
            email: f.email.trim(),
            first_name: f.first_name.trim(),
            last_name: f.last_name.trim(),
            ...(mobile ? { mobile } : {}),
          },
          {
            onSuccess: () => {
              toast.success(`Invitation sent to ${f.email.trim()}`);
              done();
            },
          },
        );
      }}
    />
  );
}

function OwnerInvite() {
  const invite = useInviteAny();
  const venues = useVenues();
  const [role, setRole] = useState<AnyInvite['role']>('VENUE_STAFF');
  const [venueId, setVenueId] = useState('');
  return (
    <InviteFields
      pending={invite.isPending}
      error={invite.isError ? errorMessage(invite.error) : null}
      canSubmit={() => venueId !== ''}
      extra={
        <>
          <div className="space-y-1">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              className={SELECT_CLASS}
              value={role}
              onChange={(e) => setRole(e.target.value as AnyInvite['role'])}
            >
              <option value="VENUE_STAFF">Staff</option>
              <option value="VENUE_MANAGER">Manager</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="invite-venue">Venue</Label>
            <select
              id="invite-venue"
              className={SELECT_CLASS}
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
            >
              <option value="">Choose a venue</option>
              {(venues.data?.data ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </>
      }
      onSubmit={(f, done) => {
        const mobile = f.mobile.trim();
        invite.mutate(
          {
            email: f.email.trim(),
            first_name: f.first_name.trim(),
            last_name: f.last_name.trim(),
            ...(mobile ? { mobile } : {}),
            role,
            venue_id: Number(venueId),
          },
          {
            onSuccess: () => {
              toast.success(`Invitation sent to ${f.email.trim()}`);
              setVenueId('');
              done();
            },
          },
        );
      }}
    />
  );
}

function InviteFields({
  pending,
  error,
  extra,
  canSubmit,
  onSubmit,
}: {
  pending: boolean;
  error: string | null;
  extra?: React.ReactNode;
  canSubmit: () => boolean;
  onSubmit: (fields: Fields, done: () => void) => void;
}) {
  const [f, setF] = useState<Fields>(EMPTY);
  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));
  const ready =
    f.email.trim() !== '' && f.first_name.trim() !== '' && f.last_name.trim() !== '' && canSubmit();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(f, () => setF(EMPTY));
      }}
      className="grid gap-3 rounded border border-border bg-surface p-3"
    >
      <h2 className="font-medium">Invite someone</h2>
      <div className="space-y-1">
        <Label htmlFor="invite-email">Email</Label>
        <Input id="invite-email" type="email" value={f.email} onChange={set('email')} />
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
      {extra}
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" loading={pending} disabled={!ready}>
        Send invitation
      </Button>
    </form>
  );
}
