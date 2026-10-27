import { expect, test, uid, useVenue } from './fixtures';

test('adds, renames, reorders and deactivates a court', async ({ ownerPage: page }) => {
  const name = `Court ${uid()}`;
  const renamed = `${name} B`;
  await page.goto('/staff/courts');
  await useVenue(page, 'E2E Riverside');

  await page.getByRole('button', { name: 'Add court', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Create court' }).click();
  const names = page.getByRole('heading', { level: 2 });
  await expect(names.last()).toHaveText(name);

  await page.getByRole('button', { name: `Rename ${name}` }).click();
  await page.getByLabel(`${name} name`).fill(renamed);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(names.last()).toHaveText(renamed);

  const secondToLast = async () => {
    const order = await names.allTextContents();
    return order.length > 1 && order.indexOf(renamed) === order.length - 2;
  };
  await page.getByRole('button', { name: `Move ${renamed} earlier` }).click();
  await expect.poll(secondToLast).toBe(true);
  await page.reload();
  await expect.poll(secondToLast).toBe(true);

  await page.getByRole('button', { name: `Deactivate ${renamed}` }).click();
  await expect(
    page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: renamed }) }),
  ).toContainText('Inactive');
});
