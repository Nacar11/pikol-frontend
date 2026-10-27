import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';

const API = 'http://localhost:8100/api/v1';
const PASSWORD = 'E2e-password-1';
export const OWNER = { email: 'owner.e2e@example.com', password: PASSWORD };
export const DESK = { email: 'desk.e2e@example.com', password: PASSWORD };

/** A fresh session per test. Refresh tokens rotate and a reused one revokes
 * the whole family, so a saved storageState shared across tests would sign
 * every later test out. */
async function signIn(page: Page, request: APIRequestContext, who: typeof OWNER) {
  const res = await request.post(`${API}/auth/login`, { data: who });
  expect(res.ok()).toBeTruthy();
  const { refresh_token } = (await res.json()) as { refresh_token: string };
  // Runs on every navigation: only seed the first one, or a reload would
  // restore the already-rotated token and trip replay detection.
  await page.addInitScript((token) => {
    if (!window.localStorage.getItem('pikol:refresh_token')) {
      window.localStorage.setItem('pikol:refresh_token', token);
    }
  }, refresh_token);
}

export const test = base.extend<{ ownerPage: Page; deskPage: Page }>({
  ownerPage: async ({ page, request }, use) => {
    await signIn(page, request, OWNER);
    await use(page);
  },
  deskPage: async ({ page, request }, use) => {
    await signIn(page, request, DESK);
    await use(page);
  },
});

/** Make `name` the active venue, whichever one the console picked first. */
export async function useVenue(page: Page, name: string) {
  const venue = page.getByRole('combobox', { name: 'Venue' });
  await expect(venue).toBeVisible();
  if ((await venue.textContent())?.includes(name)) return;
  await venue.click();
  await page.getByRole('option', { name }).click();
  await expect(venue).toContainText(name);
}

/** A short suffix that keeps names unique across runs on the same database. */
export const uid = () => Math.random().toString(36).slice(2, 7);

export { expect };
