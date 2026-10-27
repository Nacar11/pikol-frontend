'use client';

import { useParams } from 'next/navigation';
import { BookingDetail, BookingNotFound } from '@/features/bookings';

export default function BookingPage() {
  const params = useParams<{ bookingId: string }>();
  const id = Number(params.bookingId);
  if (!Number.isInteger(id) || id <= 0) return <BookingNotFound />;
  return <BookingDetail id={id} />;
}
