export type LandingPath = '/staff' | '/customer-app';

/** Where a signed-in user starts (spec §8, ADR 0003): staff to today's
 * schedule; everyone else to the page that points them at the mobile app —
 * the web is the staff console only. Decided by permission, never by role. */
export function landingPath(permissions: readonly string[]): LandingPath {
  return permissions.includes('BOOKING:ReadAny') ? '/staff' : '/customer-app';
}
