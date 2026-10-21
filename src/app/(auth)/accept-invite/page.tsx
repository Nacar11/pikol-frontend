import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AcceptInviteForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Accept invitation · Pikol' };

// Suspense: the form reads the URL (useSearchParams), which Next requires to
// sit under a boundary for static rendering.
export default function Page() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  );
}
