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
  await expect(
    page.getByRole('status').filter({ hasText: `Saved permissions for ${name}.` }),
  ).toBeVisible();
});

test('a lead cannot join a group holding permissions they lack', async ({ leadPage: page }) => {
  // Joining a group grants its codes: holding USER:Manage alone must not
  // reach PRICE:Manage through "E2E Pricing" (ADR 0003).
  await page.goto('/staff/venue-staff');
  await page.getByRole('option', { name: /E2E Pricing/ }).click();
  const detail = page.getByRole('region', { name: 'E2E Pricing' });
  await detail.getByRole('tab', { name: /Members/ }).click();
  await detail.getByLabel('Add by email').fill('lead.e2e@example.com');
  await detail.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(detail.getByRole('alert')).toContainText(
    'You can only add people to groups whose permissions you hold: PRICE:Manage.',
  );
  await expect(detail.getByText('Nobody is in this group yet.')).toBeVisible();
});
