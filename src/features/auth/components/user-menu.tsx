'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '../use-auth';

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  if (!user) return null;
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-muted-foreground sm:inline">
        {user.first_name} {user.last_name}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          await logout();
          router.replace('/login');
        }}
      >
        <LogOut aria-hidden className="size-4" />
        Sign out
      </Button>
    </div>
  );
}
