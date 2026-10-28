'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CUSTOMER_LOGIN, useAuth } from '@/features/auth';

export function SignOutButton({ variant = 'ghost' }: { variant?: 'ghost' | 'secondary' }) {
  const { logout } = useAuth();
  const router = useRouter();
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={async () => {
        await logout();
        router.replace(CUSTOMER_LOGIN);
      }}
    >
      Sign out
    </Button>
  );
}
