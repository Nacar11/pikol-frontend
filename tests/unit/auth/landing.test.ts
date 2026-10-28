import { describe, expect, it } from 'vitest';
import { landingPath } from '@/features/auth';
import { loginPathFor } from '@/features/auth/landing';

describe('landingPath', () => {
  it('sends staff to the console, even staff who are also customers', () => {
    expect(landingPath(['CLOSURE:Manage', 'BOOKING:ReadAny'])).toBe('/staff/schedule');
  });

  it('sends anyone else to /book, which explains if they cannot book', () => {
    expect(landingPath([])).toBe('/book');
  });
});

describe('loginPathFor', () => {
  it('sends the booking demo to its own door', () => {
    expect(loginPathFor('/book')).toBe('/customer-login-demo?next=%2Fbook');
    expect(loginPathFor('/book/mine')).toBe('/customer-login-demo?next=%2Fbook%2Fmine');
  });

  it('sends everything else to the staff door', () => {
    expect(loginPathFor('/staff/courts')).toBe('/login?next=%2Fstaff%2Fcourts');
    expect(loginPathFor('/bookings')).toBe('/login?next=%2Fbookings');
  });
});
