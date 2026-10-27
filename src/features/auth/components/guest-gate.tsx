'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageLoading } from '@/components/ui/page-loading';
import { landingPath } from '../landing';
import { useAuth } from '../use-auth';
import { usePermissions } from '../use-permissions';

/** Wraps the (auth) routes: a signed-in user is sent home, not shown a form. */
export function GuestGate({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && user && permissions.data) {
      router.replace(landingPath(permissions.data, user.is_customer));
    }
  }, [status, user, permissions.data, router]);

  if (status !== 'unauthenticated') return <PageLoading />;
  return <>{children}</>;
}
