import { CUSTOMER1, DESK, expect, test } from './fixtures';
import type { Page } from '@playwright/test';

async function signIn(page: Page, who: { email: string; password: string }) {
  await page.getByLabel('Email').fill(who.email);
  await page.getByLabel('Password').fill(who.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('a customer signs in at the demo door and signs out back to it', async ({ page }) => {
  await page.goto('/customer-login-demo');
  await expect(page.getByText('Demo', { exact: true })).toBeVisible();
  await signIn(page, CUSTOMER1);
  await expect(page).toHaveURL(/\/book$/);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/customer-login-demo/);
});

test('the front desk is refused at the demo door and stays signed out', async ({ page }) => {
  await page.goto('/customer-login-demo');
  await signIn(page, DESK);

  const alert = page.getByRole('main').getByRole('alert');
  await expect(alert).toContainText('This sign-in is for customers only.');
  await expect(alert.getByRole('link', { name: 'Venue staff sign in here' })).toHaveAttribute(
    'href',
    '/login',
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page).toHaveURL(/\/customer-login-demo$/);
});

test('a customer is refused at the staff door and stays signed out', async ({ page }) => {
  await page.goto('/login');
  await signIn(page, CUSTOMER1);

  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'This sign-in is for venue staff.',
  );
  await expect(page).toHaveURL(/\/login$/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('a signed-out visit to the booking demo goes to its own door', async ({ page }) => {
  await page.goto('/book/mine');
  await expect(page).toHaveURL(/\/customer-login-demo\?next=%2Fbook%2Fmine$/);
  await signIn(page, CUSTOMER1);
  await expect(page).toHaveURL(/\/book\/mine$/);
});
