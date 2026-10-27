'use client';

import { Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth';

/** Where a signed-in customer lands: booking moved to the mobile app, and
 * the web is the staff console only (ADR 0003). */
export default function CustomerAppPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Smartphone aria-hidden className="size-6" />
      </span>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Pikol for players is coming to mobile
        </h1>
        <p className="text-muted-foreground">
          {user ? `Hi ${user.first_name} — booking` : 'Booking'} courts and paying will happen in
          the Pikol app. This website is for venue staff.
        </p>
      </div>
      <Button
        variant="secondary"
        onClick={async () => {
          await logout();
          router.replace('/login');
        }}
      >
        Sign out
      </Button>
    </main>
  );
}
