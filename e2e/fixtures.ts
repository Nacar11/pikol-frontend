import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';

const API = 'http://localhost:8100/api/v1';
const PASSWORD = 'E2e-password-1';
const OWNER = { email: 'owner.e2e@example.com', password: PASSWORD };
export const DESK = { email: 'desk.e2e@example.com', password: PASSWORD };
const CUSTOMER1 = { email: 'customer1.e2e@example.com', password: PASSWORD };
const CUSTOMER2 = { email: 'customer2.e2e@example.com', password: PASSWORD };

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

export const test = base.extend<{
  ownerPage: Page;
  deskPage: Page;
  customerPage: Page;
  rivalPage: Page;
}>({
  ownerPage: async ({ page, request }, use) => {
    await signIn(page, request, OWNER);
    await use(page);
  },
  deskPage: async ({ page, request }, use) => {
    await signIn(page, request, DESK);
    await use(page);
  },
  customerPage: async ({ page, request }, use) => {
    await signIn(page, request, CUSTOMER1);
    await use(page);
  },
  /** A second customer in their own browser context — their own storage. */
  rivalPage: async ({ browser, request }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, request, CUSTOMER2);
    await use(page);
    await context.close();
  },
});

/** Set a business parameter as the owner, through the real API. */
export async function setParameter(request: APIRequestContext, key: string, value: string) {
  const login = await request.post(`${API}/auth/login`, { data: OWNER });
  const { access_token } = (await login.json()) as { access_token: string };
  const res = await request.patch(`${API}/admin/parameters/${key}`, {
    data: { value },
    headers: { Authorization: `Bearer ${access_token}` },
  });
  expect(res.ok()).toBeTruthy();
}

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
