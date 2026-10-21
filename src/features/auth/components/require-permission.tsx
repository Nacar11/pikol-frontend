'use client';

import { ShieldX } from 'lucide-react';
import { PageLoading } from '@/components/ui/page-loading';
import { usePermissions } from '../use-permissions';

/** Renders children only for holders of `code` — a UX gate. The backend
 * enforces the same permission on every route regardless. */
export function RequirePermission({ code, children }: { code: string; children: React.ReactNode }) {
  const permissions = usePermissions();
  if (permissions.isPending) return <PageLoading />;
  if (!permissions.data?.includes(code)) {
    return (
      <div role="status" className="mx-auto max-w-sm py-16 text-center">
        <ShieldX aria-hidden className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-3 text-lg font-semibold">Not available</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account does not have access to this page.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
