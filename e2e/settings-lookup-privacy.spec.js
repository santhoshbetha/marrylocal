import { test, expect } from '@playwright/test';

const viewer = {
  id: 505,
  email: 'settings.lookup@marrylocal.test',
  first_name: 'Settings',
  last_name: 'Lookup',
  user_handle: 'settings_lookup',
  shortid: 'lookup505',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
  gender: 'Female',
  city: 'Bangalore',
  state: 'Karnataka',
  images: [],
  avatar_url: null,
  restrict_lookup_to_200km: true,
  allow_email_search: false,
  allow_phone_search: false,
  allow_handle_search: true,
};

test('lookup privacy switches update optimistically and persist', async ({ page }) => {
  const patchPayloads = [];
  const profile = { ...viewer };
  let releaseFirstPatch;
  const firstPatchGate = new Promise(resolve => {
    releaseFirstPatch = resolve;
  });

  await page.addInitScript(
    ({ user }) => {
      window.localStorage.setItem('marrylocal.auth.token', 'e2e-settings-lookup-token');
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { user: viewer },
  );

  await page.route('**/api/v1/profiles/me', async route => {
    if (route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON();
      patchPayloads.push(payload);

      if (patchPayloads.length === 1) {
        await firstPatchGate;
      }

      Object.assign(profile, payload);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { profile } }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { profile: { ...profile, max_search_distance: 100 } },
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

  await page.goto('/settings');

  await expect(page.getByText('Search & Lookup Privacy', { exact: true })).toBeVisible();

  const emailToggle = page.getByTestId('settings-lookup-toggle-allow_email_search');
  const handleToggle = page.getByTestId('settings-lookup-toggle-allow_handle_search');
  const radiusToggle = page.getByTestId('settings-lookup-toggle-restrict_lookup_to_200km');

  await expect(emailToggle).toHaveAttribute('aria-checked', 'false');
  await expect(handleToggle).toHaveAttribute('aria-checked', 'true');
  await expect(radiusToggle).toHaveAttribute('aria-checked', 'true');

  // The switch flips before the PATCH resolves, then the server response confirms it.
  await emailToggle.click();
  await expect(emailToggle).toHaveAttribute('aria-checked', 'true');
  await expect.poll(() => patchPayloads.length).toBe(1);
  expect(patchPayloads[0]).toEqual({ allow_email_search: true });

  releaseFirstPatch();
  await expect(page.getByText('Privacy setting updated').first()).toBeVisible();

  // Additional toggles continue to use the same mutation contract.
  await handleToggle.click();
  await expect.poll(() => patchPayloads.length).toBe(2);
  expect(patchPayloads[1]).toEqual({ allow_handle_search: false });
  await expect(handleToggle).toHaveAttribute('aria-checked', 'false');

  await radiusToggle.click();
  await expect.poll(() => patchPayloads.length).toBe(3);
  expect(patchPayloads[2]).toEqual({ restrict_lookup_to_200km: false });
  await expect(radiusToggle).toHaveAttribute('aria-checked', 'false');
});
