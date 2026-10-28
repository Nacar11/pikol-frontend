'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageLoading } from '@/components/ui/page-loading';
import { CUSTOMER_LOGIN, landingPath, safeNext } from '../landing';
import { useAuth } from '../use-auth';
import { usePermissions } from '../use-permissions';

/** Wraps the (auth) routes: a signed-in user is sent home, not shown a form.
 * A safe `?next=` wins; otherwise, at the customer door, home for a customer
 * is /book — staff or not. It races LoginForm's own redirect, so both must
 * agree on the target. */
export function GuestGate({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== 'authenticated' || !user) return;
    // Read in the effect, not via useSearchParams: this gate sits outside the
    // pages' Suspense boundary, which a static build requires for that hook.
    const next = safeNext(new URLSearchParams(window.location.search).get('next'));
    if (next) router.replace(next);
    else if (pathname === CUSTOMER_LOGIN && user.is_customer) router.replace('/book');
    else if (permissions.data) router.replace(landingPath(permissions.data));
  }, [status, user, permissions.data, router, pathname]);

  if (status !== 'unauthenticated') return <PageLoading />;
  return <>{children}</>;
}
