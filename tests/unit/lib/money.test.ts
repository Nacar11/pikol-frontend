import { describe, expect, it } from 'vitest';
import { formatPeso, parsePesos } from '@/lib/money';

describe('money', () => {
  it('formats whole pesos without decimals', () => {
    expect(formatPeso(120000)).toBe('₱1,200');
  });

  it('keeps centavos when not whole', () => {
    expect(formatPeso(1648)).toBe('₱16.48');
  });
});

describe('parsePesos', () => {
  it('returns integer centavos', () => {
    expect(parsePesos('600')).toBe(60000);
    expect(parsePesos('600.5')).toBe(60050);
    expect(parsePesos('600.05')).toBe(60005);
    expect(parsePesos('1,200')).toBe(120000);
    expect(parsePesos('₱1,200.75')).toBe(120075);
    expect(parsePesos('  0  ')).toBe(0);
    expect(parsePesos('19.99')).toBe(1999);
    expect(parsePesos('.5')).toBe(50);
  });

  it('rejects anything else', () => {
    for (const bad of ['600.505', 'abc', '-1', '', '   ', '₱', '1.2.3', '12abc', '1e3', '-0']) {
      expect(parsePesos(bad), bad).toBeNull();
    }
  });
});
