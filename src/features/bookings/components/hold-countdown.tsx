'use client';

import { useEffect, useRef, useState } from 'react';
import { formatCountdown } from '@/lib/money';

/**
 * Counts down on the client clock. It only decides when to ask the server
 * again: `onElapsed` fires once at zero and the caller renders what comes back.
 */
export function HoldCountdown({
  expiresAt,
  onElapsed,
}: {
  expiresAt: string;
  onElapsed: () => void;
}) {
  const target = new Date(expiresAt).getTime();
  const [remaining, setRemaining] = useState(() => target - Date.now());
  const fired = useRef(false);
  const callback = useRef(onElapsed);
  callback.current = onElapsed;

  useEffect(() => {
    fired.current = false;
    const tick = () => {
      const left = target - Date.now();
      setRemaining(left);
      if (left <= 0 && !fired.current) {
        fired.current = true;
        callback.current();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <p className="text-sm text-muted-foreground">
      Court held for{' '}
      <span className="font-mono text-base font-semibold tabular-nums text-foreground">
        {formatCountdown(remaining)}
      </span>
    </p>
  );
}
