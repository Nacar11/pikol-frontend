import { ApiError } from '@/lib/api-client';

const FALLBACK = 'Something went wrong. Please try again.';

/**
 * Two error shapes reach the browser:
 *   - ours:    { detail: string, code: string | null, request_id }
 *   - FastAPI request validation (422): { detail: [{ loc, msg, type }] }
 */
type Envelope = { detail?: unknown; code?: unknown };

function envelope(err: unknown): Envelope | null {
  if (!(err instanceof ApiError)) return null;
  const body = err.body;
  return typeof body === 'object' && body !== null ? (body as Envelope) : null;
}

export function errorCode(err: unknown): string | null {
  const code = envelope(err)?.code;
  return typeof code === 'string' ? code : null;
}

export function errorMessage(err: unknown, fallback = FALLBACK): string {
  const detail = envelope(err)?.detail;
  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: unknown } | undefined;
    if (typeof first?.msg === 'string') return first.msg;
  }
  return fallback;
}
