'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageLoading } from '@/components/ui/page-loading';
import { landingPath, useAuth, usePermissions } from '@/features/auth';

/** `/` is only a redirect (spec §8): signed-out → login, otherwise the
 * landing page for the caller's permissions. */
export default function RootPage() {
  const { status } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    else if (status === 'authenticated' && permissions.data) {
      router.replace(landingPath(permissions.data));
    }
  }, [status, permissions.data, router]);

  return <PageLoading />;
}
