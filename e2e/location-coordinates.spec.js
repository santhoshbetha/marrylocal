import { test, expect } from '@playwright/test';

const sessionToken = 'e2e-location-bearer-token';

const viewer = {
  id: 31,
  email: 'viewer@example.com',
  first_name: 'Viewer',
  last_name: 'Account',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
};

const baseProfile = {
  ...viewer,
  city: 'Bangalore',
  state: 'Karnataka',
  latitude: 12.9716,
  longitude: 77.5946,
  user_coordinates_set: true,
  coords_change_locked: false,
  date_of_coordinates: null,
  allow_coords_change_at: null,
  max_search_distance: 100,
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

test('manual coordinates reject points beyond 150km and save valid points', async ({ page }) => {
  let patchPayload = null;

  await seedSession(page);

  await page.route('**/api/v1/profiles/me/location', async route => {
    patchPayload = route.request().postDataJSON();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { profile: { ...baseProfile, ...patchPayload } },
      }),
    });
  });

  await page.route('**/api/v1/profiles/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { profile: baseProfile } }),
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

  await page.goto('/location');

  await expect(page.getByRole('heading', { name: 'Manual coordinates' })).toBeVisible();

  // Delhi is well beyond 150 km from Bangalore's city anchor.
  await page.locator('#primary-latitude').fill('28.6139');
  await page.locator('#primary-longitude').fill('77.2090');
  await page.getByRole('button', { name: /Use Manual Coordinates/i }).click();

  await expect(page.getByText(/That point is/i).last()).toBeVisible();
  expect(patchPayload).toBeNull();

  // A nearby Bangalore point passes the Haversine gate.
  await page.locator('#primary-latitude').fill('12.9352');
  await page.locator('#primary-longitude').fill('77.6245');
  await page.getByRole('button', { name: /Use Manual Coordinates/i }).click();

  await expect.poll(() => patchPayload).not.toBeNull();
  expect(patchPayload).toMatchObject({ latitude: 12.9352, longitude: 77.6245 });
});
