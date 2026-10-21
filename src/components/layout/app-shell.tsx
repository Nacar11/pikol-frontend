import { Brand } from '@/components/layout/auth-shell';

/** The signed-in frame. Navigation is added per surface in Phases 7–8,
 * driven by permissions, never by role. */
export function AppShell({ menu, children }: { menu: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Brand />
          {menu}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
