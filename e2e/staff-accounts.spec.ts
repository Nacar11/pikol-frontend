import { DESK, expect, test, uid, useVenue } from './fixtures';

test('searches by email', async ({ ownerPage: page }) => {
  await page.goto('/staff/users');
  await page.getByLabel('Search name or email').fill(DESK.email);
  const rows = page.getByRole('table').getByRole('row');
  await expect(rows).toHaveCount(2); // header + Dana
  await expect(rows.last()).toContainText('Dana Desk');
});

test('an invitation shows under Invited', async ({ ownerPage: page }) => {
  const id = uid();
  await page.goto('/staff/users');
  await useVenue(page, 'E2E Riverside');
  await page.getByRole('button', { name: 'Invite staff' }).click();
  await page.getByLabel('Email', { exact: true }).fill(`inv-${id}@example.com`);
  await page.getByLabel('First name').fill('Ivy');
  await page.getByLabel('Last name').fill(id);
  await page.getByLabel('Group at E2E Riverside').click();
  await page.getByRole('option', { name: 'Front desk' }).click();
  await page.getByRole('button', { name: 'Send invitation' }).click();

  await page.getByRole('button', { name: /^Invited/ }).click();
  await expect(page.getByRole('row').filter({ hasText: `Ivy ${id}` })).toContainText('Invited');
});
