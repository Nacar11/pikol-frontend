import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from '@/lib/api-client';

type Call = { url: string; init: RequestInit };

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ApiClient', () => {
  let calls: Call[];
  let responder: (call: Call) => Response | Promise<Response>;

  beforeEach(() => {
    calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        const call = { url, init };
        calls.push(call);
        return responder(call);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const header = (call: Call, name: string) => new Headers(call.init.headers).get(name);

  it('attaches the bearer token and a request id', async () => {
    responder = () => jsonResponse(200, { ok: true });
    const client = new ApiClient({ baseUrl: 'http://api/api/v1/' });
    client.setAccessToken('tok');

    await client.get('/users/me', { params: { page: 2, empty: undefined } });

    expect(calls[0]!.url).toBe('http://api/api/v1/users/me?page=2');
    expect(header(calls[0]!, 'Authorization')).toBe('Bearer tok');
    expect(header(calls[0]!, 'X-Request-ID')).toMatch(/[0-9a-f-]{36}/);
  });

  it('sends X-Venue-ID only while the venue provider names one', async () => {
    responder = () => jsonResponse(200, {});
    const client = new ApiClient({ baseUrl: 'http://api' });
    let venue: number | null = 7;
    client.setVenueProvider(() => venue);

    await client.get('/admin/bookings');
    venue = null;
    await client.get('/admin/bookings');

    expect(header(calls[0]!, 'X-Venue-ID')).toBe('7');
    expect(header(calls[1]!, 'X-Venue-ID')).toBeNull();
  });

  it('keeps the venue header on the retry after a refresh', async () => {
    responder = (call) =>
      header(call, 'Authorization') === 'Bearer fresh'
        ? jsonResponse(200, {})
        : jsonResponse(401, { detail: 'expired', code: 'INVALID_TOKEN' });
    const client = new ApiClient({ baseUrl: 'http://api' });
    client.setAccessToken('stale');
    client.setRefreshHandler(async () => 'fresh');
    client.setVenueProvider(() => 3);

    await client.get('/admin/bookings');

    expect(header(calls[1]!, 'X-Venue-ID')).toBe('3');
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    responder = (call) =>
      header(call, 'Authorization') === 'Bearer fresh'
        ? jsonResponse(200, { id: 1 })
        : jsonResponse(401, { detail: 'expired', code: 'INVALID_TOKEN' });
    const client = new ApiClient({ baseUrl: 'http://api' });
    client.setAccessToken('stale');
    const refresh = vi.fn(async () => 'fresh');
    client.setRefreshHandler(refresh);

    await expect(client.get('/users/me')).resolves.toEqual({ id: 1 });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2);
  });

  it('coalesces ten concurrent 401s into ONE refresh', async () => {
    // The backend ROTATES refresh tokens and revokes the whole family when
    // an old one is replayed — two parallel refreshes would log the user
    // out everywhere.
    responder = (call) =>
      header(call, 'Authorization') === 'Bearer fresh'
        ? jsonResponse(200, {})
        : jsonResponse(401, { detail: 'expired' });
    const client = new ApiClient({ baseUrl: 'http://api' });
    client.setAccessToken('stale');
    let release!: (token: string) => void;
    const refresh = vi.fn(() => new Promise<string>((resolve) => (release = resolve)));
    client.setRefreshHandler(refresh);

    const requests = Array.from({ length: 10 }, (_, i) => client.get(`/r/${i}`));
    await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
    release('fresh');
    await Promise.all(requests);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('surfaces a failed refresh as ApiError 401', async () => {
    responder = () => jsonResponse(401, { detail: 'expired' });
    const client = new ApiClient({ baseUrl: 'http://api' });
    client.setRefreshHandler(async () => {
      throw new Error('refresh token revoked');
    });

    const error = await client.get('/users/me').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
  });

  it('does not refresh when told not to', async () => {
    responder = () => jsonResponse(401, { detail: 'Incorrect email or password.' });
    const client = new ApiClient({ baseUrl: 'http://api' });
    const refresh = vi.fn(async () => 'x');
    client.setRefreshHandler(refresh);

    await expect(client.post('/auth/login', {}, { skipRefresh: true })).rejects.toMatchObject({
      status: 401,
      body: { detail: 'Incorrect email or password.' },
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('returns undefined for 204 and sends JSON bodies', async () => {
    responder = () => new Response(null, { status: 204 });
    const client = new ApiClient({ baseUrl: 'http://api' });

    await expect(client.post('/auth/logout', { a: 1 })).resolves.toBeUndefined();
    expect(calls[0]!.init.body).toBe('{"a":1}');
    expect(header(calls[0]!, 'Content-Type')).toBe('application/json');
  });
});
