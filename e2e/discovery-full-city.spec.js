import { test, expect } from '@playwright/test';

const sessionToken = 'e2e-discovery-full-city-token';

const viewer = {
  id: 71,
  email: 'viewer@example.com',
  first_name: 'Viewer',
  last_name: 'Account',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
  city: 'Delhi',
  max_search_distance: 100,
};

const candidate = {
  id: 701,
  shortid: 'candidate701',
  user_handle: 'ananya_701',
  first_name: 'Ananya',
  last_name: 'Rao',
  age: 27,
  gender: 'Female',
  city: 'Delhi',
  state: 'Delhi',
  images: [],
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

async function mockShell(page) {
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
}

function discoveryResponse(locale) {
  return JSON.stringify({
    status: 'success',
    data: {
      profiles: [
        {
          ...candidate,
          ...(locale.search_mode === 'full_city' ? { distance_km: 8.4 } : {}),
        },
      ],
      pagination: {
        page: 1,
        per_page: 15,
        total: 1,
        total_pages: 1,
        has_next_page: false,
        has_more: false,
        next_cursor: null,
      },
      locale,
      search_mode: locale.search_mode,
      has_more: false,
      next_cursor: null,
    },
  });
}

test('caps radius at 300 km and toggles Full City mode', async ({ page }) => {
  const urls = [];

  await seedSession(page);
  await mockShell(page);

  await page.route('**/api/v1/profiles/discovery**', async route => {
    const url = new URL(route.request().url());
    urls.push(url);

    const fullCity = url.searchParams.get('search_mode') === 'full_city';

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: discoveryResponse(
        fullCity
          ? { search_mode: 'full_city', radius_km: null, city: 'Delhi' }
          : { search_mode: 'radius', radius_km: 100, city: 'Delhi' },
      ),
    });
  });

  await page.goto('/dashboard');

  await expect(page.getByTestId('profile-card')).toHaveCount(1);
  await expect(page.locator('#radius_km')).toHaveAttribute('max', '300');

  const fullCityToggle = page.getByTestId('discovery-full-city');
  await expect(fullCityToggle).toHaveAttribute('aria-checked', 'false');
  await expect(fullCityToggle).toBeEnabled();

  const requestsBeforeToggle = urls.length;
  await fullCityToggle.click();

  // Full City is a draft filter: it must not hit the API until Apply.
  await expect(fullCityToggle).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#radius_km')).toBeDisabled();
  await page.waitForTimeout(800);
  expect(urls.length).toBe(requestsBeforeToggle);

  await Promise.all([
    page.waitForResponse(
      res =>
        res.url().includes('/api/v1/profiles/discovery') &&
        new URL(res.url()).searchParams.get('search_mode') === 'full_city',
    ),
    page.getByRole('button', { name: 'Apply' }).click(),
  ]);

  await expect(page.getByText('Delhi · Full City')).toBeVisible();
  await expect(page.getByText('~8.4 km away')).toBeVisible();
  expect(urls.some(url => url.searchParams.get('search_mode') === 'full_city')).toBe(true);

  const requestsBeforeDisable = urls.length;
  await fullCityToggle.click();
  await expect(fullCityToggle).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('#radius_km')).toBeEnabled();
  await page.waitForTimeout(800);
  expect(urls.length).toBe(requestsBeforeDisable);

  // Apply restores the cached radius query without needing another request.
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('100 km radius')).toBeVisible();
});

test('shows the server 429 message as a toast', async ({ page }) => {
  await seedSession(page);
  await mockShell(page);

  await page.route('**/api/v1/profiles/discovery**', async route => {
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'error',
        message: 'Too many search requests. Please wait a moment before trying again.',
      }),
    });
  });

  await page.goto('/dashboard');

  await expect(
    page
      .getByRole('region', { name: 'Notifications alt+T' })
      .getByText('Too many search requests. Please wait a moment before trying again.', {
        exact: true,
      }),
  ).toBeVisible();
});
