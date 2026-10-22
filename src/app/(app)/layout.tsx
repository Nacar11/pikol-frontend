import { AppNav } from '@/components/layout/app-nav';
import { AppShell } from '@/components/layout/app-shell';
import { AuthGate, UserMenu } from '@/features/auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppShell nav={<AppNav />} menu={<UserMenu />}>
        {children}
      </AppShell>
    </AuthGate>
  );
}
