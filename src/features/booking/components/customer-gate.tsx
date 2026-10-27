'use client';

import { PageLoading } from '@/components/ui/page-loading';
import { useAuth } from '@/features/auth';
import { SignOutButton } from './sign-out-button';

/** Booking is for the Customer group (ADR 0003). Anyone else who lands here —
 * an account in no group — is told so, rather than shown a page that 403s. */
export function CustomerGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <PageLoading />;
  if (user.is_customer) return <>{children}</>;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          This account can&apos;t book courts
        </h1>
        <p className="text-muted-foreground">
          Ask the venue to add you to the Customer group, then sign in again.
        </p>
      </div>
      <SignOutButton variant="secondary" />
    </main>
  );
}
