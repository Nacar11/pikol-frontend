export type LandingPath = '/staff' | '/venues';

/** Where a signed-in user starts (spec §8): staff to today's schedule,
 * players to venues. Decided by permission, never by role name. */
export function landingPath(permissions: readonly string[]): LandingPath {
  return permissions.includes('BOOKING:ReadAny') ? '/staff' : '/venues';
}
