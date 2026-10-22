import { Brand } from '@/components/layout/auth-shell';

/** The signed-in frame. `nav` is driven by permissions, never by role. */
export function AppShell({
  nav,
  menu,
  children,
}: {
  nav?: React.ReactNode;
  menu: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Brand />
            {nav}
          </div>
          {menu}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
