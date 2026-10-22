'use client';

import { useParams } from 'next/navigation';
import { AdminBookingDetail, AdminBookingNotFound } from '@/features/admin-bookings';

export default function StaffBookingPage() {
  const params = useParams<{ bookingId: string }>();
  const id = Number(params.bookingId);
  if (!Number.isInteger(id) || id <= 0) return <AdminBookingNotFound />;
  return <AdminBookingDetail id={id} />;
}
