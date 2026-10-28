import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthHeading } from '@/components/layout/auth-shell';
import { Pill } from '@/components/ui/pill';
import { LoginForm, OtherDoor } from '@/features/auth';

export const metadata: Metadata = { title: 'Customer sign in · Pikol demo' };

/** The booking demo's own door (stand-in for the mobile app's sign-in): only
 * Customer-group accounts get through — the server refuses everyone else. */
export default function Page() {
  return (
    <Suspense>
      <div className="mb-3">
        <Pill tone="dashed">Demo</Pill>
      </div>
      <AuthHeading title="Customer sign in" subtitle="Book courts the way the mobile app will." />
      <LoginForm portal="customer" />
      <div className="mt-6 text-center">
        <OtherDoor portal="customer" />
      </div>
    </Suspense>
  );
}
