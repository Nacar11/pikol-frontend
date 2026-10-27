import { expect, test, uid, useVenue } from './fixtures';

test('creates a group and saves a permission', async ({ ownerPage: page }) => {
  const name = `Crew ${uid()}`;
  await page.goto('/staff/venue-staff');
  await useVenue(page, 'E2E Riverside');
  await page.getByRole('button', { name: 'New group', exact: true }).click();
  await page.getByLabel('New group name').fill(name);
  await page.getByRole('button', { name: 'Create' }).click();

  const detail = page.getByRole('region', { name });
  await expect(detail.getByRole('heading', { name })).toBeVisible();
  await expect(detail.getByRole('definition').nth(1)).toHaveText('0 of 9');
  await detail.getByRole('checkbox', { name: /Manage courts/ }).check();
  await detail.getByRole('button', { name: 'Save permissions' }).click();
  await expect(detail.getByRole('definition').nth(1)).toHaveText('1 of 9');
});
