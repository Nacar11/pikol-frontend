'use client';

import { useParams } from 'next/navigation';
import { PricePreview, PriceRules } from '@/features/setup';
import { StaffGate } from '@/features/staff';

export default function StaffPricingPage() {
  const params = useParams<{ courtId: string }>();
  const id = Number(params.courtId);
  if (!Number.isInteger(id) || id <= 0)
    return <p className="text-muted-foreground">Court not found</p>;
  return (
    <div className="space-y-8">
      <PriceRules courtId={id} />
      <StaffGate permission="PRICE:Manage">
        <PricePreview courtId={id} />
      </StaffGate>
    </div>
  );
}
