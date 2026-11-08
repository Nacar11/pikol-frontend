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
import { STAFF_PAGES } from '@/features/auth';

type StaffSection = 'operations' | 'setup' | 'masters';

type StaffPath = (typeof STAFF_PAGES)[number]['href'];

type StaffLink = {
  href: StaffPath;
  label: string;
  section: StaffSection;
  icon: LucideIcon;
};

/** The code that opens a page, held AT THE ACTIVE VENUE (ADR 0003). One
 * table with landing, so the sidebar and where sign-in lands cannot drift. */
const PERMISSION = new Map<string, string>(STAFF_PAGES.map((p) => [p.href, p.permission]));

export const SECTION_LABELS: Record<StaffSection, string> = {
  operations: 'Operations',
  setup: 'Setup',
  masters: 'Masters',
};

const STAFF_LINKS: StaffLink[] = [
  {
    href: '/staff/schedule',
    label: 'Schedule',
    section: 'operations',
    icon: CalendarDays,
  },
  {
    href: '/staff/resolution',
    label: 'To resolve',
    section: 'operations',
    icon: CircleAlert,
  },
  {
    href: '/staff/closures',
    label: 'Closures',
    section: 'operations',
    icon: CalendarX,
  },
  {
    href: '/staff/courts',
    label: 'Courts',
    section: 'setup',
    icon: LayoutGrid,
  },
  {
    href: '/staff/venue-staff',
    label: 'Venue staff',
    section: 'setup',
    icon: UserCog,
  },
  {
    href: '/staff/users',
    label: 'Staff accounts',
    section: 'setup',
    icon: Users,
  },
  {
    href: '/staff/venues',
    label: 'Venues',
    section: 'setup',
    icon: MapPin,
  },
  {
    href: '/staff/parameters',
    label: 'Parameters',
    section: 'setup',
    icon: SlidersHorizontal,
  },
  {
    href: '/staff/groups',
    label: 'User groups',
    section: 'masters',
    icon: ShieldCheck,
  },
];

export function visibleSections(
  permissions: readonly string[],
): { section: StaffSection; links: StaffLink[] }[] {
  return (Object.keys(SECTION_LABELS) as StaffSection[])
    .map((section) => ({
      section,
      links: STAFF_LINKS.filter(
        (l) => l.section === section && permissions.includes(PERMISSION.get(l.href) ?? ''),
      ),
    }))
    .filter((s) => s.links.length > 0);
}
