import {
  CalendarDays,
  CalendarX,
  CircleAlert,
  LayoutGrid,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type StaffSection = 'operations' | 'setup' | 'masters';

export type StaffLink = {
  href: string;
  label: string;
  /** Held AT THE ACTIVE VENUE (permissions are per venue — ADR 0003). */
  permission: string;
  section: StaffSection;
  icon: LucideIcon;
};

export const SECTION_LABELS: Record<StaffSection, string> = {
  operations: 'Operations',
  setup: 'Setup',
  masters: 'Masters',
};

export const STAFF_LINKS: StaffLink[] = [
  {
    href: '/staff/schedule',
    label: 'Schedule',
    permission: 'BOOKING:ReadAny',
    section: 'operations',
    icon: CalendarDays,
  },
  {
    href: '/staff/resolution',
    label: 'To resolve',
    permission: 'BOOKING:ReadAny',
    section: 'operations',
    icon: CircleAlert,
  },
  {
    href: '/staff/closures',
    label: 'Closures',
    permission: 'CLOSURE:Manage',
    section: 'operations',
    icon: CalendarX,
  },
  {
    href: '/staff/courts',
    label: 'Courts',
    permission: 'COURT:Manage',
    section: 'setup',
    icon: LayoutGrid,
  },
  {
    href: '/staff/venue-staff',
    label: 'Venue staff',
    permission: 'USER:Manage',
    section: 'setup',
    icon: UserCog,
  },
  {
    href: '/staff/users',
    label: 'Staff accounts',
    permission: 'USER:Manage',
    section: 'setup',
    icon: Users,
  },
  {
    href: '/staff/venues',
    label: 'Venues',
    permission: 'VENUE:Manage',
    section: 'setup',
    icon: MapPin,
  },
  {
    href: '/staff/parameters',
    label: 'Parameters',
    permission: 'PARAMETER:Manage',
    section: 'setup',
    icon: SlidersHorizontal,
  },
  {
    href: '/staff/groups',
    label: 'User groups',
    permission: 'VENUE:Manage',
    section: 'masters',
    icon: ShieldCheck,
  },
];

/** The links the caller may follow, grouped in section order; a section
 * with none is left out entirely, header and all. */
export function visibleSections(
  permissions: readonly string[],
): { section: StaffSection; links: StaffLink[] }[] {
  return (Object.keys(SECTION_LABELS) as StaffSection[])
    .map((section) => ({
      section,
      links: STAFF_LINKS.filter((l) => l.section === section && permissions.includes(l.permission)),
    }))
    .filter((s) => s.links.length > 0);
}
