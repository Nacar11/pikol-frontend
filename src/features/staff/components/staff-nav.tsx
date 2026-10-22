'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermissions } from '@/features/auth';
import { cn } from '@/lib/cn';
import { STAFF_LINKS } from '../nav-links';

/** Only the links whose permission the caller holds (never role). */
export function StaffNav() {
  const pathname = usePathname();
  const { data: permissions } = usePermissions();
  if (!permissions) return null;
  const links = STAFF_LINKS.filter((l) => permissions.includes(l.permission));
  if (links.length === 0) return null;
  return (
    <nav aria-label="Staff" className="flex items-center gap-1 overflow-x-auto">
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded px-3 py-1.5 text-sm font-medium hover:bg-muted',
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
