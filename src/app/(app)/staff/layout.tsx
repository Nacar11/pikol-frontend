import { StaffGate } from '@/features/staff';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <StaffGate permission="BOOKING:ReadAny">{children}</StaffGate>;
}
