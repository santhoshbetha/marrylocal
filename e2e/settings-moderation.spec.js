import { test, expect } from '@playwright/test';

const sessionToken = 'e2e-moderation-bearer-token';

const viewer = {
  id: 21,
  email: 'viewer@example.com',
  first_name: 'Viewer',
  last_name: 'Account',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
};

const blockedProfile = {
  id: 401,
  shortid: 'blocked401',
  user_handle: 'blocked_member',
  first_name: 'Blocked',
  last_name: 'Member',
  city: 'Bangalore',
  state: 'Karnataka',
  avatar_url: null,
};

const mutedProfile = {
  id: 402,
  shortid: 'muted402',
  user_handle: 'muted_member',
  first_name: 'Muted',
  last_name: 'Member',
  city: 'Mumbai',
  state: 'Maharashtra',
  avatar_url: null,
};

async function seedSession(page) {
  await page.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem('marrylocal.auth.token', token);
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { token: sessionToken, user: viewer },
  );
}

test('settings moderation accordion lists and restores blocked profiles', async ({ page }) => {
  let deleteUrl = null;

  await seedSession(page);

  await page.route('**/api/v1/profiles/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { profile: { ...viewer, max_search_distance: 100 } },
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
        data: {
          kind: 'moderated',
          blocked: [blockedProfile],
          muted: [mutedProfile],
          counts: { blocked: 1, muted: 1 },
        },
      }),
    });
  });

  await page.route('**/api/v1/payments/transactions**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { transactions: [] },
      }),
    });
  });

  await page.route('**/api/v1/relationships/block/401', async route => {
    deleteUrl = route.request().url();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { relationships: {} } }),
    });
  });

  await page.goto('/settings');

  await page.getByRole('button', { name: /Moderated Profiles & Connections/i }).click();

  await expect(page.getByText('Blocked Member')).toBeVisible();
  await expect(page.getByText('Muted Member')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unblock' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unmute' })).toBeVisible();

  await page.getByRole('button', { name: 'Unblock' }).click();

  await expect.poll(() => deleteUrl).toContain('/api/v1/relationships/block/401');
});
