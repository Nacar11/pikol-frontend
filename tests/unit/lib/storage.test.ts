import { afterEach, describe, expect, it, vi } from 'vitest';
import { readStorage, writeStorage } from '@/lib/storage';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('storage', () => {
  it('reads back what it wrote', () => {
    writeStorage('k', 'v');
    expect(readStorage('k')).toBe('v');
  });

  it('reads null when storage throws (private mode, blocked site data)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readStorage('k')).toBeNull();
  });

  it('drops a write when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => writeStorage('k', 'v')).not.toThrow();
  });
});
