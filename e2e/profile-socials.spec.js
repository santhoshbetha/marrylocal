import { test, expect } from '@playwright/test';

const sessionToken = 'e2e-profile-socials-token';

const viewer = {
  id: 95,
  email: 'socials@example.com',
  first_name: 'Social',
  last_name: 'Tester',
  user_handle: 'social_tester',
  shortid: 'social95',
  phone_number: '+919800000099',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
  gender: 'Male',
  bio: '',
  images: [],
  avatar_url: null,
  facebook: '',
  instagram: '',
};

test('social links save without triggering phone validation', async ({ page }) => {
  let patchPayload = null;

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

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { profile: { ...viewer, ...patchPayload } },
        }),
      });
      return;
    }

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

  await page.route('**/api/v1/payments/transactions**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { transactions: [] } }),
    });
  });

  await page.goto('/settings');

  await page.locator('#facebook').fill('https://facebook.com/social.tester');
  await page.locator('#instagram').fill('https://instagram.com/social.tester');

  await page.getByTestId('handle-save').click();

  await expect
    .poll(() => patchPayload)
    .toEqual({
      user_handle: 'social_tester',
      phone_number: '9800000099',
      instagram: 'https://instagram.com/social.tester',
      facebook: 'https://facebook.com/social.tester',
    });

  await expect(page.getByText('Profile details updated successfully!')).toBeVisible();
});
