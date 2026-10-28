import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '@/features/auth/auth-provider';
import { createQueryClient } from '@/lib/query-client';

export const router = { push: vi.fn(), replace: vi.fn() };
let searchParams = new URLSearchParams();
export function setSearch(query: string) {
  searchParams = new URLSearchParams(query);
}
let pathname = '/';
export function setPathname(path: string) {
  pathname = path;
}

/** For a test file's `vi.mock('next/navigation', ...)` — vi.mock is only
 * hoisted in test files, so the mock itself cannot live here. */
export const navigationMock = {
  useRouter: () => router,
  useSearchParams: () => searchParams,
  usePathname: () => pathname,
};

export function renderWithAuth(ui: React.ReactElement, auth: Partial<AuthContextValue> = {}) {
  const value: AuthContextValue = {
    status: 'unauthenticated',
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    ...auth,
  };
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthContext.Provider value={value}>{ui}</AuthContext.Provider>
    </QueryClientProvider>,
  );
}
