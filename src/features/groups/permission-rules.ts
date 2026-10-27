/** Plain-English labels, grouped as the checkboxes show them. */
export const PERMISSION_SECTIONS: { title: string; codes: { code: string; label: string }[] }[] = [
  {
    title: 'Bookings',
    codes: [
      { code: 'BOOKING:ReadAny', label: 'See all bookings' },
      { code: 'BOOKING:CreateWalkIn', label: 'Create walk-ins' },
      { code: 'BOOKING:MarkPaid', label: 'Mark as paid' },
      { code: 'BOOKING:SetOutcome', label: 'Record completed / no-show' },
      { code: 'BOOKING:CancelAny', label: 'Cancel any booking' },
    ],
  },
  {
    title: 'Venue setup',
    codes: [
      { code: 'CLOSURE:Manage', label: 'Manage closures' },
      { code: 'COURT:Manage', label: 'Manage courts' },
      { code: 'PRICE:Manage', label: 'Manage pricing' },
      { code: 'USER:Manage', label: 'Manage staff & groups' },
    ],
  },
  {
    title: 'Owner only',
    codes: [
      { code: 'VENUE:Manage', label: 'Manage venues' },
      { code: 'PARAMETER:Manage', label: 'Manage parameters (fees)' },
    ],
  },
];

type CheckboxState = { checked: boolean; disabled: boolean; reason: string | null };

/**
 * One checkbox, by the server's own rules (ADR 0003), so the screen never
 * offers what the API would refuse:
 * - owner-only codes are never grantable, by anyone;
 * - a group the caller may not edit is read-only;
 * - a non-owner touches only codes they hold — the rest show as the group
 *   has them, and are kept on save.
 */
export function checkboxState(
  code: string,
  ctx: {
    draft: ReadonlySet<string>;
    saved: ReadonlySet<string>;
    held: ReadonlySet<string>;
    isOwner: boolean;
    readOnly: boolean;
    ownerOnly: ReadonlySet<string>;
  },
): CheckboxState {
  if (ctx.ownerOnly.has(code))
    return { checked: false, disabled: true, reason: 'Super admin only' };
  if (ctx.readOnly) {
    return { checked: ctx.saved.has(code), disabled: true, reason: 'Managed by the owner' };
  }
  if (!ctx.isOwner && !ctx.held.has(code)) {
    return {
      checked: ctx.saved.has(code),
      disabled: true,
      reason: "You don't have this permission",
    };
  }
  return { checked: ctx.draft.has(code), disabled: false, reason: null };
}

export function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every((x) => b.has(x));
}
