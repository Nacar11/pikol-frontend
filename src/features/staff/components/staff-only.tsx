'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageLoading } from '@/components/ui/page-loading';
import { landingPath, usePermissions } from '@/features/auth';

/** The web is the staff console only (ADR 0003): anyone who is not staff —
 * a customer following an old link — goes to /customer-app rather than a
 * "Not available" inside the console frame. */
export function StaffOnly({ children }: { children: React.ReactNode }) {
  const { data: permissions } = usePermissions();
  const router = useRouter();
  const isStaff = permissions ? landingPath(permissions) === '/staff/schedule' : null;

  useEffect(() => {
    if (isStaff === false) router.replace('/customer-app');
  }, [isStaff, router]);

  if (!isStaff) return <PageLoading />;
  return <>{children}</>;
}
