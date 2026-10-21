import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { errorCode, errorMessage } from '@/lib/api-error';

describe('api-error', () => {
  it('reads our envelope', () => {
    const err = new ApiError(403, {
      detail: 'Verify your email before logging in.',
      code: 'EMAIL_NOT_VERIFIED',
      request_id: 'r',
    });

    expect(errorCode(err)).toBe('EMAIL_NOT_VERIFIED');
    expect(errorMessage(err)).toBe('Verify your email before logging in.');
  });

  it("turns FastAPI's validation array into a sentence", () => {
    const err = new ApiError(422, {
      detail: [
        {
          loc: ['body', 'password'],
          msg: 'String should have at least 8 characters',
          type: 'string_too_short',
        },
      ],
    });

    expect(errorMessage(err)).toBe('String should have at least 8 characters');
    expect(errorCode(err)).toBeNull();
  });

  it('falls back for anything else', () => {
    expect(errorMessage(new Error('network'), 'Could not sign in.')).toBe('Could not sign in.');
    expect(errorMessage(new ApiError(500, 'Internal Server Error'))).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('explains rate limiting', () => {
    const err = new ApiError(429, { detail: 'Too many attempts.', code: 'RATE_LIMITED' });
    expect(errorMessage(err)).toBe('Too many attempts.');
  });
});
