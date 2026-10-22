'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { canBookOnline, usePermissions } from '@/features/auth';
import { StaffNav } from '@/features/staff';
import { cn } from '@/lib/cn';

const PLAYER_LINKS = [
  { href: '/venues', label: 'Venues' },
  { href: '/bookings', label: 'My bookings' },
];

/** Links come from permissions, never role. */
export function AppNav() {
  const pathname = usePathname();
  const { data: permissions } = usePermissions();
  if (!permissions) return null;
  if (!canBookOnline(permissions)) return <StaffNav />;
  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {PLAYER_LINKS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded px-3 py-1.5 text-sm font-medium hover:bg-muted',
              active ? 'bg-muted text-foreground' : 'text-muted-foreground',
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
