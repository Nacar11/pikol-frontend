/** Every console page and the code that opens it, in sidebar order. The
 * sidebar draws exactly these; landing picks the first one a user may open. */
export const STAFF_PAGES = [
  { href: '/staff/schedule', permission: 'BOOKING:ReadAny' },
  { href: '/staff/resolution', permission: 'BOOKING:ReadAny' },
  { href: '/staff/closures', permission: 'CLOSURE:Manage' },
  { href: '/staff/courts', permission: 'COURT:Manage' },
  { href: '/staff/venue-staff', permission: 'USER:Manage' },
  { href: '/staff/users', permission: 'USER:Manage' },
  { href: '/staff/venues', permission: 'VENUE:Manage' },
  { href: '/staff/parameters', permission: 'PARAMETER:Manage' },
  { href: '/staff/groups', permission: 'VENUE:Manage' },
] as const;

type StaffPath = (typeof STAFF_PAGES)[number]['href'];
type LandingPath = StaffPath | '/book';

/** The account's first console page, or null when it can open none. */
function staffHome(permissions: readonly string[]): StaffPath | null {
  return STAFF_PAGES.find((p) => permissions.includes(p.permission))?.href ?? null;
}

/** The booking demo's own sign-in; `/login` is the staff console's. */
export const CUSTOMER_LOGIN = '/customer-login-demo';

/** Staff work the console: anyone who can open a page of it — decided by
 * permission, never by group name. Not just BOOKING:ReadAny: a group
 * holding only USER:Manage is staff too (ADR 0003). */
export function isStaff(permissions: readonly string[]): boolean {
  return staffHome(permissions) !== null;
}

/** Where a signed-in user starts when no door says otherwise (`/`, or an
 * auth page while signed in): staff — dual accounts included — on their
 * first console page; anyone else on /book, where `CustomerGate` speaks for
 * an account that cannot book. */
export function landingPath(permissions: readonly string[]): LandingPath {
  // Straight to the page, never via /staff: a client navigation onto a
  // route that redirects while rendering breaks the App Router.
  return staffHome(permissions) ?? '/book';
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
