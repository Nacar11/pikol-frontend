'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api-error';
import { formatPeso } from '@/lib/money';
import { usePay } from '../hooks/use-booking-mutations';

export function PayButton({
  id,
  totalCentavos,
  disabled,
}: {
  id: number;
  totalCentavos: number;
  disabled: boolean;
}) {
  const pay = usePay(id);
  return (
    <div className="space-y-2">
      {pay.isError && <Alert tone="error">{errorMessage(pay.error)}</Alert>}
      <Button
        size="full"
        loading={pay.isPending || pay.isSuccess}
        disabled={disabled}
        onClick={() => pay.mutate()}
      >
        Pay {formatPeso(totalCentavos)}
      </Button>
    </div>
  );
}
