import { AuthGate } from '@/features/auth';

/** Signed-in routes. Each area brings its own frame: the staff console its
 * sidebar shell, the player pages their top bar. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
