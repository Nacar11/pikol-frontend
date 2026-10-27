import { expect, test } from './fixtures';

test('edits a parameter and puts it back', async ({ ownerPage: page }) => {
  await page.goto('/staff/parameters');
  const card = page.getByRole('listitem').filter({ hasText: 'hold_duration_minutes' });
  const input = card.getByLabel('hold_duration_minutes', { exact: true });

  await input.fill('20');
  await expect(card.getByText('Unsaved')).toBeVisible();
  await card.getByRole('button', { name: 'Save hold_duration_minutes' }).click();
  await expect(card.locator('p').filter({ hasText: /^20 min$/ })).toBeVisible();
  await expect(card.getByText('Unsaved')).toHaveCount(0);

  await input.fill('15');
  await card.getByRole('button', { name: 'Save hold_duration_minutes' }).click();
  await expect(card.locator('p').filter({ hasText: /^15 min$/ })).toBeVisible();
});
