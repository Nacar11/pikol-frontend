import { describe, expect, it } from 'vitest';
import { landingPath } from '@/features/auth';

describe('landingPath', () => {
  it('sends anyone who can read bookings to the staff console', () => {
    expect(landingPath(['CLOSURE:Manage', 'BOOKING:ReadAny'])).toBe('/staff');
  });

  it('sends players (no permissions) to venues', () => {
    expect(landingPath([])).toBe('/venues');
  });
});
