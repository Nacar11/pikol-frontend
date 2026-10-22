import { describe, expect, it } from 'vitest';
import { isAllowedExternalUrl, navigateExternal } from '@/lib/navigate';

describe('external navigation', () => {
  it.each([
    'https://payments.maya.ph/checkout?id=abc',
    'http://localhost:8000/mock-checkout/7',
    'http://127.0.0.1:8000/mock-checkout/7',
  ])('allows %s', (url) => {
    expect(isAllowedExternalUrl(url)).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://maya.example.com/checkout',
    'http://localhost.evil.com/checkout',
    '//evil.com/checkout',
    'not a url',
  ])('rejects %s', (url) => {
    expect(isAllowedExternalUrl(url)).toBe(false);
  });

  it('throws instead of navigating to a rejected URL', () => {
    expect(() => navigateExternal('javascript:alert(1)')).toThrow();
  });
});
