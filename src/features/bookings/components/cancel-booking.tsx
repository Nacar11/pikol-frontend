'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api-error';
import { useCancelBooking } from '../hooks/use-booking-mutations';

/** Two-step inline confirm. The server decides whether the cutoff has passed. */
export function CancelBooking({ id, warnNoRefund }: { id: number; warnNoRefund: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const cancel = useCancelBooking(id);

  if (!confirming) {
    return (
      <Button variant="secondary" size="full" onClick={() => setConfirming(true)}>
        Cancel booking
      </Button>
    );
  }
  return (
    <div className="space-y-3">
      {warnNoRefund && (
        <Alert tone="info">No refund is given for a paid booking that you cancel.</Alert>
      )}
      {cancel.isError && <Alert tone="error">{errorMessage(cancel.error)}</Alert>}
      <div className="flex gap-2">
        <Button loading={cancel.isPending} onClick={() => cancel.mutate()}>
          Yes, cancel
        </Button>
        <Button variant="ghost" disabled={cancel.isPending} onClick={() => setConfirming(false)}>
          Keep it
        </Button>
      </div>
    </div>
  );
}
