'use client';

import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { usePermissions } from '@/features/auth';
import { cn } from '@/lib/cn';
import { readStorage, writeStorage } from '@/lib/storage';
import { SECTION_LABELS, visibleSections } from '../nav-links';
import { StaffNavbar } from './staff-navbar';
import { VenueSwitcher } from './venue-switcher';

const SIDEBAR_STORAGE_KEY = 'pikol:staff_sidebar';

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
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
  const [collapsed, setCollapsed] = useState(false);
  // Width transitions only after the remembered width is applied, so a
  // collapsed rail does not animate shut on every page load.
  const [animate, setAnimate] = useState(false);
  const { data: permissions } = usePermissions();
  const sections = visibleSections(permissions ?? []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    setCollapsed(readStorage(SIDEBAR_STORAGE_KEY) === 'collapsed');
    const frame = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      writeStorage(SIDEBAR_STORAGE_KEY, c ? 'expanded' : 'collapsed');
      return !c;
    });
  };

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
          animate && 'md:transition-[width] md:motion-reduce:transition-none',
          'md:translate-x-0',
          collapsed && 'md:w-16',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div
          className={cn(
            'flex h-14 items-center justify-between border-b border-neutral-900 px-4',
            collapsed && 'md:justify-center md:px-2',
          )}
        >
          <Link
            href="/staff/schedule"
            className={cn('flex items-baseline gap-2 hover:opacity-80', collapsed && 'md:hidden')}
          >
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
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            aria-controls="staff-sidebar"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden size-9 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-900 hover:text-white focus-visible:ring-white md:inline-flex"
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden className="size-4" />
            ) : (
              <PanelLeftClose aria-hidden className="size-4" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
          <VenueSwitcher collapsed={collapsed} />
          <nav aria-label="Staff" className={cn('mt-6 px-3', collapsed && 'md:px-2')}>
            {sections.map(({ section, links }, index) => (
              <div key={section} className={index > 0 ? 'mt-6' : undefined}>
                <p
                  className={cn(
                    'mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-neutral-500',
                    collapsed && 'md:sr-only',
                  )}
                >
                  {SECTION_LABELS[section]}
                </p>
                {collapsed && index > 0 && (
                  <hr aria-hidden className="mx-2 mb-2 hidden border-neutral-800 md:block" />
                )}
                <ul className="space-y-1">
                  {links.map(({ href, label, icon: Icon }) => {
                    const active = isActive(pathname, href);
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          aria-current={active ? 'page' : undefined}
                          title={collapsed ? label : undefined}
                          className={cn(
                            'relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150 focus-visible:ring-white md:min-h-9',
                            collapsed && 'md:min-h-10 md:justify-center md:px-0',
                            active
                              ? 'bg-neutral-800 text-white'
                              : 'text-neutral-300 hover:bg-neutral-900 hover:text-white',
                          )}
                        >
                          <Icon aria-hidden className="size-4 shrink-0" />
                          <span className={cn('flex-1', collapsed && 'md:sr-only')}>{label}</span>
                          {badges[href] && (
                            <span
                              className={cn(
                                collapsed && 'md:absolute md:-right-1 md:-top-1 md:scale-90',
                              )}
                            >
                              {badges[href]}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
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

      <div
        className={cn(
          'md:pl-64',
          animate &&
            'md:transition-[padding] md:duration-200 md:ease-out md:motion-reduce:transition-none',
          collapsed && 'md:pl-16',
        )}
      >
        <StaffNavbar
          permissions={permissions ?? []}
          menuOpen={open}
          onOpenMenu={() => setOpen(true)}
        />
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
