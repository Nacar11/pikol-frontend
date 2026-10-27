'use client';

import { useEffect, useState } from 'react';

/** The current instant, re-read every `everyMs` — enough for IN_PROGRESS to
 * begin and end on the hour without waiting for a refetch. */
export function useNow(everyMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(id);
  }, [everyMs]);
  return now;
}
