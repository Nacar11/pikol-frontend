import { describe, expect, it } from 'vitest';
import { landingPath } from '@/features/auth';

describe('landingPath', () => {
  it('sends anyone who can read bookings to the staff console', () => {
    expect(landingPath(['CLOSURE:Manage', 'BOOKING:ReadAny'])).toBe('/staff');
  });

  it('sends everyone else to the mobile-app notice — the web is staff only', () => {
    expect(landingPath([])).toBe('/customer-app');
  });
});
