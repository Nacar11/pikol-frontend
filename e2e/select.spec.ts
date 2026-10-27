import { expect, test, useVenue } from './fixtures';

test('the dropdown works from the keyboard', async ({ ownerPage: page }) => {
  await page.goto('/staff/courts');
  await useVenue(page, 'E2E Riverside');
  await page.getByRole('link', { name: 'Prices for Court 1' }).click();
  const hour = page.getByRole('combobox', { name: 'Hour' });
  await hour.focus();
  await page.keyboard.press('ArrowDown'); // opens on "Any hour"
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(hour).toHaveText('1 AM');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(hour).toBeFocused();
});
