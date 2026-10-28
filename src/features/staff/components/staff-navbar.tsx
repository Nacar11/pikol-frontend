'use client';

import { ChevronDown, LogOut, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/cn';
import { useStaffVenue } from '../use-staff-venue';

/**
 * The console's top bar: the mobile menu button and who is signed in. The
 * profile is a menu button (WAI-ARIA APG) whose menu holds Sign out, so the
 * action is one deliberate step away rather than sitting loose in the bar.
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
  const { user } = useAuth();
  const { venue } = useStaffVenue();
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
        <ProfileMenu first={user.first_name} last={user.last_name} email={user.email} role={role} />
      )}
    </header>
  );
}

function ProfileMenu({
  first,
  last,
  email,
  role,
}: {
  first: string;
  last: string;
  email: string;
  role: string;
}) {
  const { logout } = useAuth();
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const initials = `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();

  function close(refocus: boolean) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  // Focus the first item on open; close on a press outside.
  useEffect(() => {
    if (!open) return;
    itemRef.current?.focus();
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative ml-auto">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account: ${first} ${last}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'flex min-h-11 items-center gap-3 rounded-md px-1.5 transition-colors duration-150 hover:bg-muted sm:px-2 md:min-h-10',
          open && 'bg-muted',
        )}
      >
        <span className="hidden min-w-0 text-right sm:block">
          <span className="block truncate text-sm font-medium leading-tight">
            {first} {last}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{role}</span>
        </span>
        <span
          aria-hidden
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
        >
          {initials}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            'hidden size-4 shrink-0 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none sm:block',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              close(true);
            } else if (e.key === 'Tab') {
              close(false);
            } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
              // One item: every move lands on it.
              e.preventDefault();
              itemRef.current?.focus();
            }
          }}
          className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-md border border-border bg-surface shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span
              aria-hidden
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            >
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {first} {last}
              </p>
              <p className="truncate text-xs text-muted-foreground" title={email}>
                {email}
              </p>
              {role && <p className="mt-0.5 truncate text-xs text-muted-foreground">{role}</p>}
            </div>
          </div>
          <div className="p-1">
            <button
              ref={itemRef}
              type="button"
              role="menuitem"
              onClick={async () => {
                close(false);
                await logout();
                router.replace('/login');
              }}
              className="flex min-h-11 w-full items-center gap-2 rounded px-3 text-sm font-medium outline-none transition-colors duration-150 hover:bg-muted focus-visible:bg-muted md:min-h-9"
            >
              <LogOut aria-hidden className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
