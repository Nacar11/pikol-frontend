export const STAFF_LINKS: { href: string; label: string; permission: string }[] = [
  { href: '/staff/schedule', label: 'Schedule', permission: 'BOOKING:ReadAny' },
  { href: '/staff/resolution', label: 'To resolve', permission: 'BOOKING:ReadAny' },
  { href: '/staff/closures', label: 'Closures', permission: 'CLOSURE:Manage' },
  { href: '/staff/courts', label: 'Courts', permission: 'COURT:Manage' },
  { href: '/staff/users', label: 'Staff', permission: 'USER:Manage' },
  { href: '/staff/venues', label: 'Venues', permission: 'VENUE:Manage' },
  { href: '/staff/parameters', label: 'Parameters', permission: 'PARAMETER:Manage' },
];
