'use client';

import { RequirePermission } from '@/features/auth';

export function StaffGate({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  return <RequirePermission code={permission}>{children}</RequirePermission>;
}
