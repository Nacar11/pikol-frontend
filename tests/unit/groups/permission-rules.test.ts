import { describe, expect, it } from 'vitest';
import { checkboxState } from '@/features/groups/permission-rules';

const base = {
  draft: new Set(['BOOKING:ReadAny']),
  saved: new Set(['BOOKING:ReadAny', 'COURT:Manage']),
  held: new Set(['BOOKING:ReadAny', 'USER:Manage']),
  isOwner: false,
  readOnly: false,
  ownerOnly: new Set(['VENUE:Manage', 'PARAMETER:Manage']),
};

describe('checkboxState', () => {
  it('never offers an owner-only code, even to the owner', () => {
    expect(checkboxState('PARAMETER:Manage', { ...base, isOwner: true })).toEqual({
      checked: false,
      disabled: true,
      reason: 'Super admin only',
    });
  });

  it('shows a code the caller lacks as the group has it, and locks it', () => {
    expect(checkboxState('COURT:Manage', base)).toEqual({
      checked: true,
      disabled: true,
      reason: "You don't have this permission",
    });
  });

  it('lets the owner touch any non-owner code', () => {
    expect(checkboxState('COURT:Manage', { ...base, isOwner: true })).toMatchObject({
      checked: false,
      disabled: false,
    });
  });

  it('follows the draft for codes the caller holds', () => {
    expect(checkboxState('BOOKING:ReadAny', base)).toMatchObject({
      checked: true,
      disabled: false,
    });
    expect(checkboxState('USER:Manage', base)).toMatchObject({ checked: false, disabled: false });
  });

  it('locks everything on a read-only group', () => {
    expect(checkboxState('BOOKING:ReadAny', { ...base, readOnly: true })).toMatchObject({
      disabled: true,
      reason: 'Managed by the owner',
    });
  });
});
