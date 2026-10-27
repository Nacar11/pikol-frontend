'use client';

import { LogOut, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth, usePermissions } from '@/features/auth';
import { cn } from '@/lib/cn';
import { SECTION_LABELS, visibleSections } from '../nav-links';
import { useStaffVenue } from '../use-staff-venue';
import { VenueSwitcher } from './venue-switcher';

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The staff console frame, asima's shape: a fixed black sidebar on md+, a
 * drawer below it. Every link is filtered by the permissions held at the
 * active venue — never by role.
 *
 * `badges` maps a link's href to a count element. It is passed in, not
 * imported, because the slices that own the counts already import this one.
 */
export function StaffShell({
  badges = {},
  children,
}: {
  badges?: Record<string, React.ReactNode>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: permissions } = usePermissions();
  const sections = visibleSections(permissions ?? []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#staff-main"
        className="sr-only z-[60] rounded bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      <aside
        id="staff-sidebar"
        aria-label="Staff navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-neutral-900 bg-neutral-950 text-neutral-100 transition-transform duration-200 ease-out motion-reduce:transition-none',
          'md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-neutral-900 px-4">
          <Link href="/staff/schedule" className="flex items-baseline gap-2 hover:opacity-80">
            <span className="text-base font-semibold tracking-tight">pikol</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
              Staff
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="inline-flex size-11 items-center justify-center rounded-md text-neutral-300 hover:bg-neutral-900 focus-visible:ring-white md:hidden"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <VenueSwitcher />
          <nav aria-label="Staff" className="mt-6 px-3">
            {sections.map(({ section, links }, index) => (
              <div key={section} className={index > 0 ? 'mt-6' : undefined}>
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  {SECTION_LABELS[section]}
                </p>
                <ul className="space-y-1">
                  {links.map(({ href, label, icon: Icon }) => {
                    const active = isActive(pathname, href);
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150 focus-visible:ring-white md:min-h-9',
                            active
                              ? 'bg-neutral-800 text-white'
                              : 'text-neutral-300 hover:bg-neutral-900 hover:text-white',
                          )}
                        >
                          <Icon aria-hidden className="size-4 shrink-0" />
                          <span className="flex-1">{label}</span>
                          {badges[href]}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <SignedIn permissions={permissions ?? []} />
      </aside>

      {/* Mobile drawer backdrop. */}
      <button
        type="button"
        aria-label="Close navigation"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 motion-reduce:transition-none md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface px-2 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="staff-sidebar"
          className="inline-flex size-11 items-center justify-center rounded-md hover:bg-muted"
        >
          <Menu aria-hidden className="size-5" />
        </button>
        <span className="text-sm font-semibold tracking-tight">pikol</span>
      </header>

      <div className="md:pl-64">
        <main
          id="staff-main"
          tabIndex={-1}
          className="mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

/** Who is signed in, set apart at the bottom with sign-out. "Super admin"
 * is read from an owner-only permission, never from a role. */
function SignedIn({ permissions }: { permissions: readonly string[] }) {
  const { user, logout } = useAuth();
  const { venue } = useStaffVenue();
  const router = useRouter();
  if (!user) return null;
  const initials = `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase();
  const role = permissions.includes('VENUE:Manage')
    ? 'Super admin'
    : (venue?.groups.join(', ') ?? '');
  return (
    <div className="flex items-center gap-3 border-t border-neutral-900 px-4 py-3">
      <span
        aria-hidden
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-semibold"
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {user.first_name} {user.last_name}
        </p>
        <p className="truncate text-xs text-neutral-400">{role}</p>
      </div>
      <button
        type="button"
        aria-label="Sign out"
        onClick={async () => {
          await logout();
          router.replace('/login');
        }}
        className="inline-flex size-11 items-center justify-center rounded-md text-neutral-300 hover:bg-neutral-900 hover:text-white focus-visible:ring-white"
      >
        <LogOut aria-hidden className="size-4" />
      </button>
    </div>
  );
}
