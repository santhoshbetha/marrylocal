import { test, expect } from '@playwright/test';

const sessionToken = 'e2e-payment-gate-token';

const viewer = {
  id: 91,
  email: 'payment.gate@marrylocal.test',
  first_name: 'Payment',
  last_name: 'Tester',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
  payment_enforcement_active: true,
  paymentenforcementactive: true,
  onetime_fees_required: true,
  onetimefeesrequired: true,
  onetime_fees_paid: false,
  onetimefeespaid: false,
  accepted_one_time_fees_amount: 500,
  referral_credits_count: 3,
  max_search_distance: 100,
};

test('payment-gated users see the fee callout and never call discovery', async ({ page }) => {
  let discoveryRequests = 0;

  await page.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem('marrylocal.auth.token', token);
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { token: sessionToken, user: viewer },
  );

  page.on('request', request => {
    if (request.url().includes('/api/v1/profiles/discovery')) {
      discoveryRequests += 1;
    }
  });

  await page.route('**/api/v1/profiles/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { profile: viewer } }),
    });
  });

  await page.route('**/api/v1/notifications**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { notifications: [], pagination: { page: 1, total: 0 }, unread_count: 0 },
      }),
    });
  });

  await page.route('**/api/v1/relationships/moderated**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { kind: 'moderated', blocked: [], muted: [], counts: { blocked: 0, muted: 0 } },
      }),
    });
  });

  await page.goto('/dashboard/search');

  const banner = page.getByTestId('payment-gate-banner');
  await expect(banner).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Annual Service Fee Required' })).toBeVisible();
  await expect(banner).toContainText('Referral discount');
  await expect(banner).toContainText('Payable ₹350');

  const feeLink = page.getByRole('link', { name: 'Complete Service Fee Payment →' });
  await expect(feeLink).toBeVisible();
  await expect(feeLink).toHaveAttribute('href', '/dashboard/servicefees');

  await expect(page.getByRole('link', { name: 'Service Fees' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply' })).toBeDisabled();
  await expect(page.getByTestId('discovery-sort-trigger')).toBeDisabled();

  await page.waitForTimeout(1200);
  expect(discoveryRequests).toBe(0);
});
