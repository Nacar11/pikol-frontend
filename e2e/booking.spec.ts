import type { Page } from '@playwright/test';
import { expect, setParameter, test } from './fixtures';

// The customer flow on the real stack, against the mock Maya (ADR 0004).
// Every spec books E2E Lakeside's one court two days out, each at its own
// hour, so they never collide on the shared database. The last spec reads
// the statuses the earlier ones left behind, so they run in order.
test.describe.configure({ mode: 'serial' });

const VENUE = 'E2E Lakeside';
const DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(
  new Date(Date.now() + 2 * 86_400_000),
);

async function openVenue(page: Page) {
  await page.goto('/book');
  await page.getByRole('link', { name: new RegExp(VENUE) }).click();
  await page.waitForURL(/\/book\/\d+/);
  await page.goto(`${new URL(page.url()).pathname}?date=${DAY}`);
}

const cell = (page: Page, hour: string) =>
  page.getByRole('button', { name: new RegExp(`^Court 1, ${hour}, `) });

/** Pick hours, Pay now, and land on the hold page. */
async function hold(page: Page, ...hours: string[]) {
  await openVenue(page);
  for (const hour of hours) await cell(page, hour).click();
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByRole('heading', { name: /^Pay within \d:\d\d$/ })).toBeVisible();
}

/** From the hold page to the mock Maya page. */
async function toMaya(page: Page) {
  await page.getByRole('button', { name: 'Continue to Maya' }).click();
  await expect(page.getByText('MOCK MAYA')).toBeVisible();
}

async function onMaya(page: Page, outcome: 'Pay' | 'Decline' | 'Back out') {
  await page.getByRole('button', { name: outcome, exact: true }).click();
  await page.waitForURL(/\/book\/result\/\d+/);
}

test('book and pay', async ({ customerPage: page }) => {
  await hold(page, '8 AM', '9 AM');
  await expect(page.getByText('Court 1 · 8 AM – 10 AM')).toBeVisible();
  await toMaya(page);
  await onMaya(page, 'Pay');

  await expect(page.getByRole('heading', { name: 'Payment successful' })).toBeVisible();
  await expect(page.getByText('Paid bookings are final.')).toBeVisible();
});

test('two customers race for one hour', async ({ customerPage: page, rivalPage: rival }) => {
  await openVenue(rival); // the rival's grid still shows 10 AM free
  await hold(page, '10 AM');

  await cell(rival, '10 AM').click();
  await rival.getByRole('button', { name: 'Pay now' }).click();

  await expect(rival.getByText(/These hours were just taken: Court 1/)).toBeVisible();
  await expect(rival.getByLabel('Court 1, 10 AM, taken')).toBeVisible();
  await expect(rival.getByRole('region', { name: 'Your picks' })).toBeHidden();

  await page.getByRole('button', { name: 'Cancel and release hours' }).click();
  await expect(page.getByRole('heading', { name: 'Payment cancelled' })).toBeVisible();
});

test('decline releases the hours', async ({ customerPage: page, rivalPage: rival }) => {
  await hold(page, '11 AM');
  await toMaya(page);
  await onMaya(page, 'Decline');
  await expect(page.getByRole('heading', { name: 'Payment failed' })).toBeVisible();

  await hold(rival, '11 AM');
  await rival.getByRole('button', { name: 'Cancel and release hours' }).click();
});

test('back out releases the hours', async ({ customerPage: page }) => {
  await hold(page, '12 PM');
  await toMaya(page);
  await onMaya(page, 'Back out');
  await expect(page.getByRole('heading', { name: 'Payment cancelled' })).toBeVisible();

  await openVenue(page);
  await expect(cell(page, '12 PM')).toBeVisible();
});

test.describe('paying after the hold ended', () => {
  // A one-minute hold, so "late" is a 65-second wait instead of five minutes.
  test.beforeEach(async ({ request }) => setParameter(request, 'hold_duration_minutes', '1'));
  test.afterEach(async ({ request }) => setParameter(request, 'hold_duration_minutes', '5'));

  test('pay late, hour still free', async ({ customerPage: page }) => {
    test.setTimeout(150_000);
    await hold(page, '2 PM');
    await toMaya(page);
    await page.waitForTimeout(65_000);
    await onMaya(page, 'Pay');

    await expect(page.getByRole('heading', { name: 'Payment successful' })).toBeVisible();
  });

  test('pay late, hour taken', async ({ customerPage: page, rivalPage: rival }) => {
    test.setTimeout(180_000);
    await hold(page, '4 PM');
    await toMaya(page);
    await page.waitForTimeout(65_000);

    await hold(rival, '4 PM');
    await toMaya(rival);
    await onMaya(rival, 'Pay');
    await expect(rival.getByRole('heading', { name: 'Payment successful' })).toBeVisible();

    await onMaya(page, 'Pay');
    await expect(
      page.getByRole('heading', { name: 'Paid too late — fully refunded' }),
    ).toBeVisible();
  });
});

test('my bookings shows each status', async ({ customerPage: page }) => {
  await page.goto('/book/mine');
  const list = page.getByRole('list', { name: 'Your payments' });
  for (const status of ['Successful', 'Failed', 'Cancelled', 'Refunded']) {
    await expect(list.getByText(status, { exact: true }).first()).toBeVisible();
  }
});
