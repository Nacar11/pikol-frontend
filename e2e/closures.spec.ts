import { expect, test, uid, useVenue } from './fixtures';

test('closes two courts for tomorrow, then reopens them', async ({ ownerPage: page }) => {
  const reason = `Resurfacing ${uid()}`;
  await page.goto('/staff/closures');
  await useVenue(page, 'E2E Riverside');
  await page.getByLabel('Court 1', { exact: true }).check();
  await page.getByLabel('Court 2', { exact: true }).check();
  await page.getByRole('button', { name: 'All day tomorrow' }).click();
  await expect(page.getByText('24 h', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Maintenance' }).click();
  await expect(page.getByLabel('Reason', { exact: true })).toHaveValue('Maintenance');
  await page.getByLabel('Reason', { exact: true }).fill(reason);
  await page.getByRole('button', { name: 'Close courts' }).click();

  const card = page.getByRole('listitem').filter({ hasText: reason });
  await expect(card).toContainText('24 h');
  await expect(card.getByText('Court 1', { exact: true })).toBeVisible();
  await expect(card.getByText('Court 2', { exact: true })).toBeVisible();

  await card.getByRole('button', { name: `Reopen ${reason}` }).click();
  await card.getByLabel('Why are the courts reopening?').fill('Finished early');
  await card.getByRole('button', { name: 'Reopen courts' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: reason })).toHaveCount(0);
});
