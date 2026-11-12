import { test, expect } from '@playwright/test';

const sessionToken = 'e2e-verification-gate-token';

const viewer = {
  id: 81,
  email: 'verified.gate@marrylocal.test',
  first_name: 'Gate',
  last_name: 'Tester',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
  force_verification_required: true,
  forceverificationrequired: true,
  around_user_count: 67,
  max_search_distance: 100,
};

test('verification-required users see the banner and never call discovery', async ({ page }) => {
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
      body: JSON.stringify({
        status: 'success',
        data: { profile: viewer },
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

  await page.goto('/dashboard/search');

  const banner = page.getByTestId('verification-gate-banner');
  await expect(banner).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Identity Verification Required' })).toBeVisible();
  await expect(banner).toContainText(
    'Your free 7-day trial period has ended and there are over 50 active members in your area.',
  );

  const verifyLink = page.getByRole('link', { name: 'Verify Profile Now →' });
  await expect(verifyLink).toBeVisible();
  await expect(verifyLink).toHaveAttribute('href', '/verify');

  await expect(page.getByRole('button', { name: 'Apply' })).toBeDisabled();
  await expect(page.getByTestId('discovery-sort-trigger')).toBeDisabled();

  await page.waitForTimeout(1200);
  expect(discoveryRequests).toBe(0);
});
