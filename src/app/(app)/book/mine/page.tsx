import { PageHeader } from '@/components/layout/page-header';
import { MyBookings } from '@/features/booking';

export default function MyBookingsPage() {
  return (
    <>
      <PageHeader section="Book" title="My bookings" />
      <MyBookings />
    </>
  );
}
