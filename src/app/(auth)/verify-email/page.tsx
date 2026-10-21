import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerifyEmail } from '@/features/auth';

export const metadata: Metadata = { title: 'Verify email · Pikol' };

// Suspense: the form reads the URL (useSearchParams), which Next requires to
// sit under a boundary for static rendering.
export default function Page() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
