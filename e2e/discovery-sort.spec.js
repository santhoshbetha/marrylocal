import { test, expect } from '@playwright/test';

const sessionToken = 'e2e-discovery-sort-token';

const viewer = {
  id: 51,
  email: 'viewer@example.com',
  first_name: 'Viewer',
  last_name: 'Account',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
};

const candidate = {
  id: 601,
  shortid: 'candidate601',
  user_handle: 'ananya_601',
  first_name: 'Ananya',
  last_name: 'Rao',
  age: 27,
  gender: 'Female',
  city: 'Bangalore',
  state: 'Karnataka',
  images: [],
  is_liked: false,
  is_shortlisted: false,
  is_online: false,
  last_seen_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
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

test('discovery sort selector sends sort_by to the discovery endpoint', async ({ page }) => {
  const discoveryUrls = [];

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
        data: { kind: 'moderated', blocked: [], muted: [], counts: { blocked: 0, muted: 0 } },
      }),
    });
  });

  await page.route('**/api/v1/profiles/discovery**', async route => {
    discoveryUrls.push(route.request().url());

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          profiles: [candidate],
          pagination: {
            page: 1,
            per_page: 20,
            total: 1,
            total_pages: 1,
            has_next_page: false,
          },
          locale: { radius_km: 100, latitude: 12.9716, longitude: 77.5946 },
        },
      }),
    });
  });

  await page.goto('/dashboard');

  await expect(page.getByTestId('profile-card')).toHaveCount(1);
  await expect(page.getByTestId('discovery-sort-trigger')).toBeVisible();
  await expect(page.getByText(/Active:/).first()).toBeVisible();

  await page.getByTestId('discovery-sort-trigger').click();
  await page.getByRole('option', { name: 'Sort by Age' }).click();

  await expect
    .poll(() => discoveryUrls.some(url => new URL(url).searchParams.get('sort_by') === 'age'))
    .toBe(true);
});
