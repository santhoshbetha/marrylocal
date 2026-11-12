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

const priya = {
  id: 2,
  email: 'bangalore.demo.priya@marrylocal.test',
  first_name: 'Priya',
  last_name: 'Gowda',
  user_handle: 'priya_gowda',
  shortid: 'seed00009',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
  email_verified: true,
  images: [],
  avatar_url: null,
};

async function installMocks(page) {
  const state = {
    currentUser: admin,
    broadcasts: [],
  };

  await page.route('**/api/v1/auth/login', async route => {
    const body = route.request().postDataJSON();
    const email = body?.user?.email;
    state.currentUser = email === priya.email ? priya : admin;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          token: `e2e-${state.currentUser.role}-token`,
          token_type: 'Bearer',
          expires_in_days: 14,
          user: state.currentUser,
        },
      }),
    });
  });

  await page.route('**/api/v1/auth/logout', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success' }),
    });
  });

  await page.route('**/api/v1/profiles/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { profile: state.currentUser } }),
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
    const notifications =
      state.currentUser.email === priya.email
        ? [
            {
              id: 901,
              type: 'system',
              title: 'Bangalore Meetup Alert',
              body: 'Join us this weekend in Bangalore.',
              is_read: false,
              metadata: {},
              inserted_at: '2026-11-11T10:00:00Z',
            },
          ]
        : [];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          notifications,
          pagination: { page: 1, per_page: 20, total: notifications.length, total_pages: 1 },
          unread_count: notifications.length,
        },
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

  await page.route('**/api/v1/admin/notifications/broadcast', async route => {
    state.broadcasts.push(route.request().postDataJSON());

    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'queued', estimated_recipients: 1 }),
    });
  });

  return state;
}

async function login(page, email) {
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill('Password123!');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(email === priya.email ? /\/dashboard\/search/ : /\/admin$/);
}

test('admin sends location and individual notifications, then Priya sees the system alert', async ({
  page,
}) => {
  const state = await installMocks(page);

  await login(page, admin.email);
  await page.goto('/admin/notifications');
  await expect(page.getByRole('heading', { name: 'System Notifications' })).toBeVisible();

  await page.getByTestId('notification-title').fill('Bangalore Meetup Alert');
  await page.getByTestId('notification-body').fill('Join us this weekend in Bangalore.');

  await page.getByRole('tab', { name: 'By Location' }).click();
  await page.locator('#notification-state').click();
  await page.getByRole('option', { name: 'Karnataka' }).click();
  await page.locator('#notification-city').click();
  await page.getByRole('option', { name: 'Bangalore' }).click();
  await page.locator('#notification-gender').click();
  await page.getByRole('option', { name: 'Female' }).click();

  const [locationResponse] = await Promise.all([
    page.waitForResponse(
      res =>
        res.url().includes('/api/v1/admin/notifications/broadcast') &&
        res.request().method() === 'POST',
    ),
    page.getByTestId('notification-send').click(),
  ]);

  expect(locationResponse.status()).toBe(202);
  await expect(page.getByText('Notification queued for 1 recipient.')).toBeVisible();

  expect(state.broadcasts[0]).toMatchObject({
    target_type: 'location',
    state: 'Karnataka',
    city: 'Bangalore',
    gender: 'Female',
    title: 'Bangalore Meetup Alert',
    body: 'Join us this weekend in Bangalore.',
  });

  await page.getByRole('tab', { name: 'Specific Individuals' }).click();
  await page.getByTestId('notification-title').fill('Priya Invite');
  await page.getByTestId('notification-body').fill('A personal invitation for Priya.');
  await page
    .getByTestId('notification-identifiers')
    .fill('@priya; bangalore.demo.priya@marrylocal.test');

  const [individualResponse] = await Promise.all([
    page.waitForResponse(
      res =>
        res.url().includes('/api/v1/admin/notifications/broadcast') &&
        res.request().method() === 'POST',
    ),
    page.getByTestId('notification-send').click(),
  ]);

  expect(individualResponse.status()).toBe(202);
  expect(state.broadcasts[1]).toMatchObject({
    target_type: 'individual',
    title: 'Priya Invite',
    identifiers: ['@priya', 'bangalore.demo.priya@marrylocal.test'],
  });

  // Log out locally, then sign in as Priya and verify the live inbox payload.
  await page.evaluate(() => {
    Object.keys(window.localStorage)
      .filter(key => key.startsWith('marrylocal.auth'))
      .forEach(key => window.localStorage.removeItem(key));
  });

  await login(page, priya.email);
  await page.goto('/notifications');

  await expect(page.getByText('Bangalore Meetup Alert')).toBeVisible();
  await expect(page.getByText('Join us this weekend in Bangalore.')).toBeVisible();
});
