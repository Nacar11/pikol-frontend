'use client';

import { useEffect, useState } from 'react';

const left = (expiresAt: string) =>
  Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000));

/** Whole seconds until `expiresAt`, ticking each second, never below 0. The
 * server's clock decides; this only shows it. */
export function useSecondsLeft(expiresAt: string): number {
  const [seconds, setSeconds] = useState(() => left(expiresAt));
  useEffect(() => {
    setSeconds(left(expiresAt));
    const id = window.setInterval(() => setSeconds(left(expiresAt)), 1_000);
    return () => window.clearInterval(id);
  }, [expiresAt]);
  return seconds;
}

/** 292 → "4:52". */
export function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
