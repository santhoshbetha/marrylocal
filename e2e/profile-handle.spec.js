import { test, expect } from '@playwright/test';

const sessionToken = 'e2e-profile-handle-token';

const viewer = {
  id: 96,
  email: 'handle@example.com',
  first_name: 'Handle',
  last_name: 'Tester',
  user_handle: 'existing_handle',
  shortid: 'handle96',
  phone_number: '+919800000098',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
  gender: 'Female',
  bio: '',
  images: [],
  avatar_url: null,
  facebook: '',
  instagram: '',
};

test('handle availability is debounced, blocks taken values, and saves available ones', async ({
  page,
}) => {
  let patchPayload = null;
  let savedHandle = viewer.user_handle;
  let handleChecks = 0;

  await page.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem('marrylocal.auth.token', token);
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { token: sessionToken, user: viewer },
  );

  await page.route('**/api/v1/profiles/me', async route => {
    if (route.request().method() === 'PATCH') {
      patchPayload = route.request().postDataJSON();
      savedHandle = patchPayload.user_handle ?? savedHandle;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { profile: { ...viewer, user_handle: savedHandle } },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { profile: { ...viewer, user_handle: savedHandle, max_search_distance: 100 } },
      }),
    });
  });

  await page.route('**/api/v1/auth/check-handle**', async route => {
    handleChecks += 1;
    const handle = new URL(route.request().url()).searchParams.get('handle');

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        handle === 'taken_handle'
          ? { available: false, message: 'This handle is already taken.' }
          : { available: true, message: 'Handle is available!' },
      ),
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

  const handleInput = page.getByTestId('handle-input');
  await expect(handleInput).toBeVisible();
  await expect(handleInput).toHaveValue('existing_handle');

  await handleInput.fill('fresh_handle');
  await expect(page.getByText('✅ Handle is available!')).toBeVisible();
  await expect(page.getByTestId('handle-save')).toBeEnabled();

  await page.getByTestId('handle-save').click();

  await expect
    .poll(() => patchPayload)
    .toEqual({
      user_handle: 'fresh_handle',
      phone_number: '9800000098',
      instagram: '',
      facebook: '',
    });
  await expect(page.getByText('Profile details updated successfully!')).toBeVisible();
  expect(handleChecks).toBeGreaterThanOrEqual(1);

  await handleInput.fill('taken_handle');
  await expect(page.getByText('❌ This handle is already taken.')).toBeVisible();
  await expect(page.getByTestId('handle-save')).toBeDisabled();

  // The taken value was never submitted.
  expect(patchPayload.user_handle).toBe('fresh_handle');
});
