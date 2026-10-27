import { describe, expect, it } from 'vitest';
import {
  addDays,
  formatDateTime,
  formatDayChip,
  formatDayLong,
  formatHour,
  formatDayParts,
  formatHourOfDay,
  formatTimeRange,
  formatWeekRange,
  isManilaDay,
  isoWeek,
  manilaDayOf,
  manilaInstant,
  manilaToday,
  mondayOf,
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

describe('manilaInstant', () => {
  it('joins a Manila day and hour into an offset instant', () => {
    expect(manilaInstant('2026-10-23', 22)).toBe('2026-10-23T22:00:00+08:00');
    expect(manilaInstant('2026-10-24', 0)).toBe('2026-10-24T00:00:00+08:00');
  });

  it('throws on an hour outside 0-23 or a bad day', () => {
    expect(() => manilaInstant('2026-10-23', 24)).toThrow();
    expect(() => manilaInstant('2026-10-23', -1)).toThrow();
    expect(() => manilaInstant('2026-10-23', 1.5)).toThrow();
    expect(() => manilaInstant('2026-02-30', 5)).toThrow();
    expect(() => manilaInstant('nope', 5)).toThrow();
  });
});

describe('formatHourOfDay', () => {
  it('labels an hour index', () => {
    expect(formatHourOfDay(0)).toBe('12 AM');
    expect(formatHourOfDay(12)).toBe('12 PM');
    expect(formatHourOfDay(18)).toBe('6 PM');
    expect(formatHourOfDay(23)).toBe('11 PM');
  });

  it('throws outside 0-23', () => {
    expect(() => formatHourOfDay(24)).toThrow();
  });
});

describe('weeks', () => {
  it('mondayOf starts weeks on Monday, Sunday included in the week before', () => {
    expect(mondayOf('2026-09-07')).toBe('2026-09-07');
    expect(mondayOf('2026-09-13')).toBe('2026-09-07'); // a Sunday
    expect(mondayOf('2026-10-01')).toBe('2026-09-28'); // across a month
  });

  it('a late-Sunday Manila instant is still that Sunday’s week', () => {
    // 11:30 PM Sunday in Manila is 3:30 PM Sunday UTC — and still Sunday in
    // any UTC− zone a browser might be in. Days are strings, so none applies.
    const sunday = manilaDayOf('2026-09-13T15:30:00Z');
    expect(sunday).toBe('2026-09-13');
    expect(mondayOf(sunday)).toBe('2026-09-07');
  });

  it('isoWeek follows ISO-8601, including the week-year at New Year', () => {
    expect(isoWeek('2026-09-07')).toEqual({ year: 2026, week: 37 });
    expect(isoWeek('2027-01-01')).toEqual({ year: 2026, week: 53 });
    expect(isoWeek('2027-01-04')).toEqual({ year: 2027, week: 1 });
  });

  it('formats the heading parts and the week range', () => {
    expect(formatDayParts('2026-09-07')).toEqual({
      title: 'Monday, 7 September',
      weekday: 'MON',
      day: '7',
    });
    expect(formatWeekRange('2026-09-07')).toBe('7–13 Sep');
    expect(formatWeekRange('2026-09-28')).toBe('28 Sep – 4 Oct');
  });
});
