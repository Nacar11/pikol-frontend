'use client';

import { Button } from '@/components/ui/button';
import type { Outcome } from '../schemas';

export function OutcomeButtons({
  onOutcome,
  pending,
}: {
  onOutcome: (outcome: Outcome) => void;
  pending: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Record the outcome</p>
      <div className="flex gap-2">
        <Button disabled={pending} onClick={() => onOutcome('COMPLETED')}>
          Completed
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => onOutcome('NO_SHOW')}>
          No-show
        </Button>
      </div>
    </div>
  );
}
