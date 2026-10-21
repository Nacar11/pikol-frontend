import { AppShell } from '@/components/layout/app-shell';
import { AuthGate, UserMenu } from '@/features/auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppShell menu={<UserMenu />}>{children}</AppShell>
    </AuthGate>
  );
}
