type LandingPath = '/staff/schedule' | '/book';

/** Staff work the console; decided by permission, never by group name. */
export function isStaff(permissions: readonly string[]): boolean {
  return permissions.includes('BOOKING:ReadAny');
}

/** Where a signed-in user starts. Customers book — even staff who are also
 * customers (the web stands in for the mobile app); staff who are not
 * customers work the console; anyone else lands on /book, which tells them
 * the account cannot book. */
export function landingPath(permissions: readonly string[], isCustomer: boolean): LandingPath {
  // Straight to the page, never via /staff: a client navigation onto a
  // route that redirects while rendering breaks the App Router.
  if (isCustomer || !isStaff(permissions)) return '/book';
  return '/staff/schedule';
}
