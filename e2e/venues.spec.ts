import { expect, test, uid } from './fixtures';

test('adds and edits a venue, and links to its courts', async ({ ownerPage: page }) => {
  const name = `Venue ${uid()}`;
  await page.goto('/staff/venues');
  await page.getByRole('button', { name: 'Add venue', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByLabel('Address', { exact: true }).fill('Cebu City');
  await page.getByRole('button', { name: 'Create venue' }).click();
  const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name }) });
  await expect(card).toContainText('Cebu City');

  await card.getByRole('button', { name: `Edit ${name}` }).click();
  await page.getByLabel(`${name} name`).fill(`${name} North`);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { name: `${name} North` })).toBeVisible();

  await page.getByRole('link', { name: `Courts at ${name} North` }).click();
  await expect(page).toHaveURL(/\/staff\/courts\?venue=\d+/);
});
