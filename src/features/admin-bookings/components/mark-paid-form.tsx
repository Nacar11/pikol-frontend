'use client';

import { Button } from '@/components/ui/button';
import type { ManualPaymentMethod } from '../schemas';

/** `ONLINE` is not offered: online money arrives only through the provider. */
export function MarkPaidForm({
  onPay,
  pending,
}: {
  onPay: (method: ManualPaymentMethod) => void;
  pending: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Collect payment</p>
      <div className="flex gap-2">
        <Button disabled={pending} onClick={() => onPay('CASH')}>
          Cash
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => onPay('MANUAL_GCASH')}>
          GCash (manual)
        </Button>
      </div>
    </div>
  );
}
