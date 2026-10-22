import { describe, expect, it } from 'vitest';
import {
  addDays,
  formatDateTime,
  formatDayChip,
  formatDayLong,
  formatHour,
  formatTimeRange,
  isManilaDay,
  manilaDayOf,
  manilaToday,
} from '@/lib/manila';

describe('manila', () => {
  it('manilaToday rolls over at 16:00 UTC', () => {
    expect(manilaToday(new Date('2026-10-22T16:30:00Z'))).toBe('2026-10-23');
    expect(manilaToday(new Date('2026-10-22T15:59:00Z'))).toBe('2026-10-22');
  });

  it('manilaDayOf returns the Manila calendar day of an instant', () => {
    expect(manilaDayOf('2026-10-22T16:00:00Z')).toBe('2026-10-23');
    expect(manilaDayOf('2026-10-22T15:59:59Z')).toBe('2026-10-22');
  });

  it('addDays is pure calendar arithmetic', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('isManilaDay rejects impossible and malformed dates', () => {
    expect(isManilaDay('2026-10-22')).toBe(true);
    expect(isManilaDay('2026-02-30')).toBe(false);
    expect(isManilaDay('22-10-2026')).toBe(false);
  });

  it('formats hours on the Manila clock', () => {
    expect(formatHour('2026-10-22T16:00:00Z')).toBe('12 AM');
    expect(formatHour('2026-10-23T10:00:00Z')).toBe('6 PM');
  });

  it('formats a range across midnight', () => {
    expect(formatTimeRange('2026-10-22T15:00:00Z', '2026-10-22T17:00:00Z')).toBe('11 PM – 1 AM');
    expect(formatTimeRange('2026-10-23T10:00:00Z', '2026-10-23T12:00:00Z')).toBe('6 PM – 8 PM');
  });

  it('formats day chips and long days', () => {
    expect(formatDayChip('2026-10-23')).toEqual({ weekday: 'Fri', date: '23 Oct' });
    expect(formatDayLong('2026-10-23')).toBe('Friday, 23 October 2026');
  });

  it('formats a date and time', () => {
    expect(formatDateTime('2026-10-23T10:00:00Z')).toBe('23 Oct, 6:00 PM');
  });
});
