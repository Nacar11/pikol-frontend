/**
 * Manila time. Every time the player sees is Asia/Manila, never the browser's
 * zone (spec §8.2), and a "day" is a Manila calendar day. Days travel as
 * `YYYY-MM-DD` strings so no zone can shift them.
 */
export const MANILA = 'Asia/Manila';

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parts(date: Date, options: Intl.DateTimeFormatOptions): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat('en-PH', {
    timeZone: MANILA,
    ...options,
  }).formatToParts(date)) {
    out[p.type] = p.value;
  }
  return out;
}

/** "AM"/"PM" come back lowercase or dotted in some locales; normalise. */
function meridiem(value: string | undefined): string {
  return (value ?? '').replace(/\./g, '').toUpperCase();
}

/** The Manila calendar day containing `now`, as `YYYY-MM-DD`. */
export function manilaToday(now: Date = new Date()): string {
  const p = parts(now, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${p.year}-${p.month}-${p.day}`;
}

/** The Manila calendar day containing the instant `iso`. */
export function manilaDayOf(iso: string): string {
  return manilaToday(new Date(iso));
}

function parseDay(day: string): Date | null {
  const m = DAY_RE.exec(day);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  const valid =
    date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
  return valid ? date : null;
}

/** Calendar arithmetic on the string itself; no time zone involved. */
export function addDays(day: string, n: number): string {
  const date = parseDay(day);
  if (!date) throw new Error(`Invalid day: ${day}`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

/** Validates the `?date=` param: well-formed and a real calendar day. */
export function isManilaDay(value: string): boolean {
  return parseDay(value) !== null;
}

/** "6 PM" / "12 AM". */
export function formatHour(iso: string): string {
  const p = parts(new Date(iso), { hour: 'numeric', hour12: true });
  return `${p.hour} ${meridiem(p.dayPeriod)}`;
}

/** Noon UTC of a day string renders as that same calendar day in Manila. */
function dayAnchor(day: string): Date {
  const date = parseDay(day);
  if (!date) throw new Error(`Invalid day: ${day}`);
  date.setUTCHours(4);
  return date;
}

/** { weekday: "Fri", date: "23 Oct" }. */
export function formatDayChip(day: string): { weekday: string; date: string } {
  const p = parts(dayAnchor(day), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return { weekday: p.weekday ?? '', date: `${p.day} ${p.month}` };
}

/** "Friday, 23 October 2026". */
export function formatDayLong(day: string): string {
  const p = parts(dayAnchor(day), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}`;
}

/** "6 PM – 8 PM". */
export function formatTimeRange(startsIso: string, endsIso: string): string {
  return `${formatHour(startsIso)} – ${formatHour(endsIso)}`;
}

/** "23 Oct, 6:00 PM". */
export function formatDateTime(iso: string): string {
  const p = parts(new Date(iso), {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${p.day} ${p.month}, ${p.hour}:${p.minute} ${meridiem(p.dayPeriod)}`;
}
