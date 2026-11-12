import { test, expect } from '@playwright/test';

const admin = {
  id: 1,
  email: 'admin.santhosh@marrylocal.test',
  first_name: 'Santhosh',
  last_name: 'Admin',
  user_handle: 'admin_santhosh',
  shortid: 'admin00001',
  role: 'admin',
  user_state: 'active',
  terms_accepted: true,
  email_verified: true,
  is_beta_tester: true,
  onboarding_complete: true,
  images: [],
  avatar_url: null,
};

async function installMocks(page) {
  const state = {
    previews: [],
    sends: [],
  };

  await page.route('**/api/v1/auth/login', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          token: 'e2e-admin-email-token',
          token_type: 'Bearer',
          expires_in_days: 14,
          user: admin,
        },
      }),
    });
  });

  await page.route('**/api/v1/profiles/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { profile: admin } }),
    });
  });

  await page.route('**/api/v1/profiles/discovery**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          profiles: [],
          pagination: {
            page: 1,
            per_page: 20,
            total: 0,
            total_pages: 0,
            has_next_page: false,
          },
          locale: { radius_km: 100, latitude: 12.9716, longitude: 77.5946 },
        },
      }),
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

  await page.route('**/api/v1/payments/transactions**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { transactions: [] } }),
    });
  });

  await page.route('**/api/v1/admin/emails/preview-count**', async route => {
    const url = new URL(route.request().url());
    const mode = url.searchParams.get('mode') || 'manual';
    state.previews.push(Object.fromEntries(url.searchParams.entries()));

    const count =
      mode === 'location'
        ? url.searchParams.get('state') === 'Delhi' && url.searchParams.get('city') === 'Delhi'
          ? 2
          : 0
        : (url.searchParams.get('emails') || '')
            .split(';')
            .map(value => value.trim())
            .filter(Boolean).length;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', recipient_count: count }),
    });
  });

  await page.route('**/api/v1/admin/emails/bulk-send', async route => {
    const payload = route.request().postDataJSON();
    state.sends.push(payload);

    const count =
      payload.mode === 'location' ? 2 : Array.isArray(payload.emails) ? payload.emails.length : 0;

    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'queued', queued_count: count }),
    });
  });

  return state;
}

test('admin sends manual and location-targeted bulk emails', async ({ page }) => {
  const state = await installMocks(page);

  await page.goto('/login');
  await page.locator('#login-email').fill(admin.email);
  await page.locator('#login-password').fill('Password123!');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto('/admin/emails');
  await expect(page.getByRole('heading', { name: /Email Templates/i })).toBeVisible();

  // Manual mode.
  await page
    .locator('#manual-emails')
    .fill('delhi.demo.neha@marrylocal.test; mumbai.demo.rahul@marrylocal.test');
  await page.locator('#email-subject').fill('Manual broadcast');
  await page.locator('#email-content').fill('<p>Hello manual recipients.</p>');

  const [manualResponse] = await Promise.all([
    page.waitForResponse(
      res =>
        res.url().includes('/api/v1/admin/emails/bulk-send') && res.request().method() === 'POST',
    ),
    page.getByRole('button', { name: /Send to 2 recipients/i }).click(),
  ]);

  expect(manualResponse.status()).toBe(202);
  await expect(page.getByText('Queued 2 recipients from the manual audience.')).toBeVisible();

  expect(state.sends[0]).toMatchObject({
    mode: 'manual',
    emails: ['delhi.demo.neha@marrylocal.test', 'mumbai.demo.rahul@marrylocal.test'],
    gender: 'All',
    subject: 'Manual broadcast',
    content: '<p>Hello manual recipients.</p>',
  });

  // Location mode with server-side preview.
  await page.getByRole('tab', { name: 'Location Based' }).click();
  await page.locator('#state-select').click();
  await page.getByRole('option', { name: 'Delhi', exact: true }).click();
  await page.locator('#city-select').click();
  await page.getByRole('option', { name: 'Delhi', exact: true }).click();

  await page.getByRole('button', { name: 'Get Recipients Count' }).click();
  await expect(page.getByTestId('email-location-count')).toHaveText('2 recipients matched');

  const [locationResponse] = await Promise.all([
    page.waitForResponse(
      res =>
        res.url().includes('/api/v1/admin/emails/bulk-send') && res.request().method() === 'POST',
    ),
    page.getByRole('button', { name: /Send to 2 recipients/i }).click(),
  ]);

  expect(locationResponse.status()).toBe(202);
  await expect(page.getByText('Queued 2 recipients from the location audience.')).toBeVisible();

  expect(state.sends[1]).toMatchObject({
    mode: 'location',
    state: 'Delhi',
    city: 'Delhi',
    gender: 'All',
    subject: 'Manual broadcast',
    content: '<p>Hello manual recipients.</p>',
  });
});
