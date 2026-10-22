'use client';

import { RequirePermission } from '@/features/auth';

/** A page-level permission gate for staff screens. */
export function StaffGate({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  return <RequirePermission code={permission}>{children}</RequirePermission>;
}
