import { describe, expect, it } from 'vitest';
import { landingPath } from '@/features/auth';

describe('landingPath', () => {
  it('sends a customer to the booking home, even one who is also staff', () => {
    expect(landingPath(['BOOKING:ReadAny'], true)).toBe('/book');
    expect(landingPath([], true)).toBe('/book');
  });

  it('sends staff who are not customers to the console', () => {
    expect(landingPath(['CLOSURE:Manage', 'BOOKING:ReadAny'], false)).toBe('/staff/schedule');
  });

  it('sends anyone else to /book, which explains they cannot book', () => {
    expect(landingPath([], false)).toBe('/book');
  });
});
