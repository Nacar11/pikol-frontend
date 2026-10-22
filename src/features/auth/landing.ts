export type LandingPath = '/staff' | '/venues';

/** Where a signed-in user starts (spec §8): staff to today's schedule,
 * players to venues. Decided by permission, never by role name. */
export function landingPath(permissions: readonly string[]): LandingPath {
  return permissions.includes('BOOKING:ReadAny') ? '/staff' : '/venues';
}

/** Online booking is player-only (`POST /bookings` is 403 for staff), so it
 * is offered to anyone who cannot read all bookings. Same signal as
 * `landingPath`; no role parsing. */
export function canBookOnline(permissions: readonly string[]): boolean {
  return !permissions.includes('BOOKING:ReadAny');
}
