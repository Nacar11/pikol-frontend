import Link from 'next/link';
import { SignOutButton } from './sign-out-button';

/** A plain top bar — the web stand-in for the mobile app, not the console. */
export function CustomerShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-surface">
        <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/book" className="text-lg font-semibold tracking-tight">
            Pikol
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/book/mine" className="px-3 text-sm font-medium hover:underline">
              My bookings
            </Link>
            <SignOutButton />
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-40">{children}</main>
    </div>
  );
}
