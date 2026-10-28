type LandingPath = '/staff/schedule' | '/book';

/** The booking demo's own sign-in; `/login` is the staff console's. */
export const CUSTOMER_LOGIN = '/customer-login-demo';

/** Staff work the console; decided by permission, never by group name. */
export function isStaff(permissions: readonly string[]): boolean {
  return permissions.includes('BOOKING:ReadAny');
}

/** Where a signed-in user starts when no door says otherwise (`/`, or an
 * auth page while signed in): staff — dual accounts included — work the
 * console; anyone else lands on /book, where `CustomerGate` speaks for an
 * account that cannot book. */
export function landingPath(permissions: readonly string[]): LandingPath {
  // Straight to the page, never via /staff: a client navigation onto a
  // route that redirects while rendering breaks the App Router.
  return isStaff(permissions) ? '/staff/schedule' : '/book';
}

/** Only same-site paths: `//evil.example` is protocol-relative, not local. */
export function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

/** Where a signed-out visitor to `pathname` signs in: the booking demo has
 * its own door. */
export function loginPathFor(pathname: string): string {
  const door = pathname === '/book' || pathname.startsWith('/book/') ? CUSTOMER_LOGIN : '/login';
  return `${door}?next=${encodeURIComponent(pathname)}`;
}
