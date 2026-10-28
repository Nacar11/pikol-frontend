import { expect, test } from './fixtures';

/** A day well clear of the other specs, so its hours are open. */
function dayAhead(days: number) {
  const d = new Date(Date.now() + days * 86_400_000);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

test('every booking decision asks before it acts', async ({ deskPage: page }) => {
  await page.goto(`/staff/schedule?date=${dayAhead(12)}`);
  await page
    .getByRole('button', { name: /, available, ₱/ })
    .first()
    .click();

  // Book walk-in: Escape backs out, and nothing is booked.
  const walkIns = page.getByRole('link', { name: /Walk-in, awaiting payment/ });
  const before = await walkIns.count();
  await page.getByRole('button', { name: 'Book walk-in' }).click();
  const walkIn = page.getByRole('alertdialog', { name: 'Book this walk-in?' });
  await expect(walkIn).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(walkIn).toBeHidden();
  await expect(walkIns).toHaveCount(before);

  await page.getByRole('button', { name: 'Book walk-in' }).click();
  await walkIn.getByRole('button', { name: 'Book walk-in' }).click();
  await expect(walkIn).toBeHidden();
  await page
    .getByRole('link', { name: /Walk-in, awaiting payment/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/staff\/bookings\/\d+$/);

  // Cash: going back leaves it unpaid; confirming records it.
  await page.getByRole('button', { name: 'Cash', exact: true }).click();
  const pay = page.getByRole('alertdialog', { name: /^Collect ₱[\d,]+ by Cash\?$/ });
  await pay.getByRole('button', { name: 'Go back' }).click();
  await expect(pay).toBeHidden();
  await expect(page.getByRole('button', { name: 'Cash', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cash', exact: true }).click();
  await pay.getByRole('button', { name: 'Mark paid · Cash' }).click();
  await expect(page.getByText('Paid by Cash')).toBeVisible();

  // Cancel: the dialog repeats the reason and the no-refund rule.
  await page.getByLabel('Reason for cancelling').fill('Player called off');
  await page.getByRole('button', { name: 'Cancel booking' }).click();
  const cancel = page.getByRole('alertdialog', { name: 'Cancel this booking?' });
  await expect(cancel).toContainText('Reason: Player called off');
  await expect(cancel).toContainText('No refund is issued.');
  await cancel.getByRole('button', { name: 'Cancel booking' }).click();
  await expect(cancel).toBeHidden();
  await expect(page.getByText('Cancellation reason')).toBeVisible();
});
