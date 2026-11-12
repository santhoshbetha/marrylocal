import { test, expect } from '@playwright/test';

const sessionToken = 'e2e-notifications-bearer-token';

const viewer = {
  id: 11,
  email: 'viewer@example.com',
  first_name: 'Viewer',
  last_name: 'Account',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
};

const notifications = [
  {
    id: 901,
    type: 'profile_like',
    title: 'New profile like',
    body: 'Ananya liked your profile.',
    is_read: false,
    read_at: null,
    actor_id: 201,
    metadata: {
      sender_id: 201,
      sender_handle: 'ananya',
      sender_shortid: 'ananya201',
    },
    inserted_at: new Date().toISOString(),
  },
  {
    id: 902,
    type: 'system',
    title: 'Platform maintenance',
    body: 'Scheduled maintenance will begin at midnight.',
    is_read: false,
    read_at: null,
    actor_id: null,
    metadata: {},
    inserted_at: new Date().toISOString(),
  },
];

async function seedSession(page) {
  await page.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem('marrylocal.auth.token', token);
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { token: sessionToken, user: viewer },
  );
}

test('notification center renders typed rows and marks all as read', async ({ page }) => {
  let markAllCalled = false;

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

  await page.route('**/api/v1/notifications**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (request.method() === 'POST' && path.endsWith('/mark-all-read')) {
      markAllCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { updated: 2, unread_count: 0 },
        }),
      });
      return;
    }

    if (request.method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { notification: { ...notifications[0], is_read: true }, unread_count: 1 },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          notifications,
          pagination: { page: 1, per_page: 20, total: 2, total_pages: 1 },
          unread_count: 2,
        },
      }),
    });
  });

  await page.goto('/dashboard/notifications');

  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  await expect(page.getByText('2 unread')).toBeVisible();
  await expect(page.getByText('New profile like')).toBeVisible();
  await expect(page.getByText('Platform maintenance')).toBeVisible();
  await expect(page.getByText('Profile like', { exact: true })).toBeVisible();
  await expect(page.getByText('System', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Mark all read/i }).click();

  await expect.poll(() => markAllCalled).toBe(true);
});

test('clicking an actionable notification marks it read and opens the profile', async ({
  page,
}) => {
  let markReadCalled = false;

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

  await page.route('**/api/v1/profiles/ananya201**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          profile: {
            id: 201,
            shortid: 'ananya201',
            first_name: 'Ananya',
            last_name: 'Sharma',
            gender: 'Female',
            user_state: 'active',
            images: [],
          },
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

  await page.route('**/api/v1/notifications**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (request.method() === 'PATCH' && path.endsWith('/901/read')) {
      markReadCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            notification: {
              ...notifications[0],
              is_read: true,
              read_at: new Date().toISOString(),
            },
            unread_count: 1,
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          notifications,
          pagination: { page: 1, per_page: 20, total: 2, total_pages: 1 },
          unread_count: 2,
        },
      }),
    });
  });

  await page.goto('/dashboard/notifications');
  await page.getByTestId('notification-901').click();

  await expect(page).toHaveURL(/\/user\/ananya201$/);
  await expect.poll(() => markReadCalled).toBe(true);
});
