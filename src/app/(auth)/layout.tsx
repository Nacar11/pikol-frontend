import { AuthShell } from '@/components/layout/auth-shell';
import { GuestGate } from '@/features/auth';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuestGate>
      <AuthShell>{children}</AuthShell>
    </GuestGate>
  );
}
