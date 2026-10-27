import { CustomerGate, CustomerShell } from '@/features/booking';

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerGate>
      <CustomerShell>{children}</CustomerShell>
    </CustomerGate>
  );
}
