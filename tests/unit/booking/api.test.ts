import { describe, expect, it, vi } from 'vitest';
import { checkoutApi } from '@/features/booking/api';
import type { ApiClient } from '@/lib/api-client';
import { checkoutFixture } from './fixtures';

describe('checkoutApi', () => {
  it('posts the items to /checkouts/me and parses the checkout', async () => {
    const post = vi.fn().mockResolvedValue(checkoutFixture());
    const client = { post } as unknown as ApiClient;
    const items = [{ court_id: 7, starts_at: '2026-10-29T10:00:00Z', hours: 2 }];

    const checkout = await checkoutApi.create(items, client);

    expect(post).toHaveBeenCalledWith('/checkouts/me', { items });
    expect(checkout.reference_code).toBe('PKL-AB234');
  });

  it('refuses a response with an unknown status', async () => {
    const post = vi.fn().mockResolvedValue({ ...checkoutFixture(), status: 'PAID' });
    await expect(checkoutApi.pay(1, { post } as unknown as ApiClient)).rejects.toThrow();
  });
});
