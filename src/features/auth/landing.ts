type LandingPath = '/staff/schedule' | '/customer-app';

/** Where a signed-in user starts (spec §8, ADR 0003): staff to today's
 * schedule; everyone else to the page that points them at the mobile app —
 * the web is the staff console only. Decided by permission, never by role. */
export function landingPath(permissions: readonly string[]): LandingPath {
  // Straight to the page, never via /staff: a client navigation onto a
  // route that redirects while rendering breaks the App Router.
  return permissions.includes('BOOKING:ReadAny') ? '/staff/schedule' : '/customer-app';
}
