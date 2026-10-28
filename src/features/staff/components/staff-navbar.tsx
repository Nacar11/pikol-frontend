'use client';

import { LogOut, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth';
import { useStaffVenue } from '../use-staff-venue';

/**
 * The console's top bar: the mobile menu button and who is signed in, with
 * sign-out set apart on the right, away from the sidebar's navigation.
 * "Super admin" is read from an owner-only permission, never from a role.
 */
export function StaffNavbar({
  permissions,
  menuOpen,
  onOpenMenu,
}: {
  permissions: readonly string[];
  menuOpen: boolean;
  onOpenMenu: () => void;
}) {
  const { user, logout } = useAuth();
  const { venue } = useStaffVenue();
  const router = useRouter();
  const role = permissions.includes('VENUE:Manage')
    ? 'Super admin'
    : (venue?.groups.join(', ') ?? '');

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface px-2 md:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open navigation"
        aria-expanded={menuOpen}
        aria-controls="staff-sidebar"
        className="inline-flex size-11 items-center justify-center rounded-md hover:bg-muted md:hidden"
      >
        <Menu aria-hidden className="size-5" />
      </button>
      <span className="text-sm font-semibold tracking-tight md:hidden">pikol</span>

      {user && (
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-medium leading-tight">
              {user.first_name} {user.last_name}
            </p>
            <p className="truncate text-xs text-muted-foreground">{role}</p>
          </div>
          <span
            aria-hidden
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          >
            {`${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase()}
          </span>
          <span aria-hidden className="h-6 w-px bg-border" />
          <button
            type="button"
            aria-label="Sign out"
            onClick={async () => {
              await logout();
              router.replace('/login');
            }}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium transition-colors duration-150 hover:bg-muted sm:px-3 md:min-h-9"
          >
            <LogOut aria-hidden className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      )}
    </header>
  );
}
