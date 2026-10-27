import { AppNav } from '@/components/layout/app-nav';
import { AppShell } from '@/components/layout/app-shell';
import { UserMenu } from '@/features/auth';

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={<AppNav />} menu={<UserMenu />}>
      {children}
    </AppShell>
  );
}
