import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthHeading } from '@/components/layout/auth-shell';
import { LoginForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Sign in · Pikol' };

// Suspense: the form reads the URL (useSearchParams), which Next requires to
// sit under a boundary for static rendering.
export default function Page() {
  return (
    <Suspense>
      <AuthHeading title="Sign in" subtitle="Welcome back." />
      <LoginForm />
    </Suspense>
  );
}
