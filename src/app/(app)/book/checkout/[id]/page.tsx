'use client';

import { useParams } from 'next/navigation';
import { HoldPage } from '@/features/booking';

export default function CheckoutPage() {
  return <HoldPage id={Number(useParams<{ id: string }>().id)} />;
}
