import { describe, expect, it } from 'vitest';
import { formatCountdown, formatPeso } from '@/lib/money';

describe('money', () => {
  it('formats whole pesos without decimals', () => {
    expect(formatPeso(120000)).toBe('₱1,200');
  });

  it('keeps centavos when not whole', () => {
    expect(formatPeso(1648)).toBe('₱16.48');
  });

  it('formats a countdown, floored and clamped', () => {
    expect(formatCountdown(899_999)).toBe('14:59');
    expect(formatCountdown(-5)).toBe('0:00');
    expect(formatCountdown(0)).toBe('0:00');
  });
});
