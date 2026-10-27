'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageLoading } from '@/components/ui/page-loading';
import { isStaff, usePermissions } from '@/features/auth';

/** Anyone who is not staff — a customer following a console link — goes to
 * the booking home rather than a "Not available" inside the console frame. */
export function StaffOnly({ children }: { children: React.ReactNode }) {
  const { data: permissions } = usePermissions();
  const router = useRouter();
  const staff = permissions ? isStaff(permissions) : null;

  useEffect(() => {
    if (staff === false) router.replace('/book');
  }, [staff, router]);

  if (!staff) return <PageLoading />;
  return <>{children}</>;
}
