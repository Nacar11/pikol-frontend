import { describe, expect, it } from 'vitest';
import { canBookOnline, landingPath } from '@/features/auth';

describe('landingPath', () => {
  it('sends anyone who can read bookings to the staff console', () => {
    expect(landingPath(['CLOSURE:Manage', 'BOOKING:ReadAny'])).toBe('/staff');
  });

  it('sends players (no permissions) to venues', () => {
    expect(landingPath([])).toBe('/venues');
  });
});

describe('canBookOnline', () => {
  it('is false for anyone who can read bookings', () => {
    expect(canBookOnline(['BOOKING:ReadAny'])).toBe(false);
  });

  it('is true for players (no permissions)', () => {
    expect(canBookOnline([])).toBe(true);
  });
});
