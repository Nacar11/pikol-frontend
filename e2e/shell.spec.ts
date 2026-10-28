import { DESK, expect, test } from './fixtures';

test('signing in lands on the schedule', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(DESK.email);
  await page.getByLabel('Password').fill(DESK.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/staff\/schedule/);
});

test('switching venue shows that venue and survives a reload', async ({ ownerPage: page }) => {
  await page.goto('/staff/courts');
  const venue = page.getByRole('combobox', { name: 'Venue' });
  await venue.click();
  await page.getByRole('option', { name: 'E2E Lakeside' }).click();
  await expect(venue).toContainText('E2E Lakeside');
  await expect(page.getByRole('heading', { name: 'Court 1' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Court 2' })).toHaveCount(0);
  await page.reload();
  await expect(venue).toContainText('E2E Lakeside');
});

test('the sidebar collapses to a rail and remembers it', async ({ ownerPage: page }) => {
  await page.goto('/staff/schedule');
  const sidebar = page.locator('#staff-sidebar');
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(64);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(256);
});

test('front desk sees only what its permissions allow', async ({ deskPage: page }) => {
  await page.goto('/staff/schedule');
  const nav = page.getByRole('navigation', { name: 'Staff' });
  await expect(nav.getByRole('link', { name: 'Closures' })).toBeVisible();
  for (const hidden of ['Courts', 'Venues', 'Parameters', 'User groups']) {
    await expect(nav.getByRole('link', { name: hidden })).toHaveCount(0);
  }
});

test('signs out from the top bar back to the staff door', async ({ deskPage: page }) => {
  await page.goto('/staff/schedule');
  const sidebar = page.locator('#staff-sidebar');
  await expect(sidebar.getByRole('button', { name: 'Sign out' })).toHaveCount(0);
  await page.getByRole('banner').getByRole('button', { name: 'Sign out' }).click();
  // AuthGate may get there first and add ?next=, as it always has.
  await expect(page).toHaveURL(/\/login(\?|$)/);
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});
