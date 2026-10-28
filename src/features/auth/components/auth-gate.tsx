'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageLoading } from '@/components/ui/page-loading';
import { loginPathFor } from '../landing';
import { useAuth } from '../use-auth';

/** Wraps every (app) route: nothing renders until the session is known, and
 * a signed-out visitor goes to sign in — the booking demo at its own door —
 * remembering where they were headed. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(loginPathFor(pathname));
    }
  }, [status, router, pathname]);

  if (status !== 'authenticated') return <PageLoading />;
  return <>{children}</>;
}
