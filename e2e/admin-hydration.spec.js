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

// Deliberately omits `role` to simulate a partial profile payload. Hydration
// must preserve the role already stored in the persisted session shell.
const partialProfile = {
  id: admin.id,
  email: admin.email,
  first_name: admin.first_name,
  last_name: admin.last_name,
  user_handle: admin.user_handle,
  shortid: admin.shortid,
  user_state: admin.user_state,
  terms_accepted: admin.terms_accepted,
  email_verified: admin.email_verified,
  onboarding_complete: true,
  images: [],
  avatar_url: null,
};

async function installMocks(page, profile = partialProfile, sessionUser = admin) {
  await page.addInitScript(
    ({ user }) => {
      window.localStorage.setItem('marrylocal.auth.token', 'e2e-admin-hydration-token');
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { user: sessionUser },
  );

  await page.route('**/api/v1/profiles/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { profile } }),
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
}

test('admin role survives reload even when /profiles/me omits role', async ({ page }) => {
  await installMocks(page);

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
  await expect(page).toHaveURL(/\/admin$/);

  const persisted = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('marrylocal.auth.user') || 'null'),
  );

  expect(persisted?.role).toBe('admin');

  await page.goto('/dashboard/search');
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto('/notifications');
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto('/dashboard/search-user');
  await expect(page.getByRole('link', { name: 'User Management' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'System Notifications' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Notifications', exact: true })).toHaveCount(0);
});

test('regular user still redirects away from /admin after hydration', async ({ page }) => {
  const regular = { ...admin, id: 7, email: 'regular@marrylocal.test', role: 'user' };
  const partialRegular = {
    ...partialProfile,
    id: regular.id,
    email: regular.email,
    user_handle: 'regular_user',
    shortid: 'regular7',
  };

  await installMocks(page, partialRegular, regular);

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/dashboard\/search-user$/);
});
