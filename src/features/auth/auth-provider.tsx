'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { authApi } from './api';
import type { AuthUser, LoginInput, TokenPair } from './schemas';

export const REFRESH_STORAGE_KEY = 'pikol:refresh_token';
const REFRESH_LOCK = 'pikol:refresh';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

export type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  login: (input: LoginInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function readStored(): string | null {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(REFRESH_STORAGE_KEY);
}

function writeStored(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(REFRESH_STORAGE_KEY, token);
  else window.localStorage.removeItem(REFRESH_STORAGE_KEY);
}

/**
 * Rotate the refresh token, serialised ACROSS TABS.
 *
 * The backend treats a replayed refresh token as theft and revokes every
 * session of the user. Two tabs refreshing with the same stored token at once
 * would do exactly that. Inside the Web Lock each tab re-reads the token, so
 * the second one uses the token the first just stored. Within one tab,
 * ApiClient already coalesces concurrent refreshes.
 */
async function rotate(): Promise<TokenPair> {
  const run = async () => {
    const current = readStored();
    if (!current) throw new Error('no refresh token');
    const pair = await authApi.refresh(current);
    writeStored(pair.refresh_token);
    return pair;
  };
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(REFRESH_LOCK, run);
  }
  return run();
}

/**
 * Owns the session: access token in memory, refresh token in localStorage,
 * both wired into the shared apiClient. The ONLY place that injects them.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const queryClient = useQueryClient();
  const bootstrapped = useRef(false);
  const expiryNotified = useRef(false);

  const signedOut = useCallback(
    (notify: boolean) => {
      apiClient().setAccessToken(null);
      writeStored(null);
      setUser(null);
      setStatus('unauthenticated');
      // Bookings (and their cached Maya checkout URLs) are per-user: drop
      // everything, or the next player on this tab sees the last one's.
      queryClient.clear();
      if (notify && !expiryNotified.current) {
        expiryNotified.current = true;
        toast.warning('Your session expired. Please sign in again.');
      }
    },
    [queryClient],
  );

  const signedIn = useCallback(async (pair: TokenPair): Promise<AuthUser> => {
    apiClient().setAccessToken(pair.access_token);
    writeStored(pair.refresh_token);
    const me = await authApi.me();
    setUser(me);
    setStatus('authenticated');
    expiryNotified.current = false;
    return me;
  }, []);

  // ApiClient calls this on a 401 (and coalesces concurrent calls).
  useEffect(() => {
    apiClient().setRefreshHandler(async () => {
      try {
        const pair = await rotate();
        apiClient().setAccessToken(pair.access_token);
        return pair.access_token;
      } catch (err) {
        signedOut(true);
        throw err;
      }
    });
    return () => apiClient().setRefreshHandler(null);
  }, [signedOut]);

  // Restore the session once per page load. The ref (not a `cancelled`
  // flag) guards it: StrictMode re-runs effects in development, and a second
  // refresh with the same token would be a replay that revokes every session.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    if (!readStored()) {
      setStatus('unauthenticated');
      return;
    }
    rotate()
      .then(signedIn)
      .catch(() => signedOut(true));
  }, [signedIn, signedOut]);

  const login = useCallback(
    async (input: LoginInput) => signedIn(await authApi.login(input)),
    [signedIn],
  );

  const logout = useCallback(async () => {
    // Revokes every refresh token server-side; drop ours whatever happens.
    await authApi.logout().catch(() => undefined);
    signedOut(false);
  }, [signedOut]);

  const value = useMemo(() => ({ status, user, login, logout }), [status, user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
