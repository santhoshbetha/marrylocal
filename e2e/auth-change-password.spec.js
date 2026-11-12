import { test, expect } from '@playwright/test';

const email = 'e2e.pwd.user@marrylocal.test';
const originalPassword = 'Password123!';
const updatedPassword = 'NewPassword456!';
const sessionToken = 'e2e-change-password-token';

const viewer = {
  id: 502,
  email,
  first_name: 'Password',
  last_name: 'Tester',
  user_handle: 'password_tester',
  shortid: 'pwd502',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
  email_verified: true,
  onboarding_complete: true,
  images: [],
  avatar_url: null,
};

async function installShellMocks(page) {
  await page.route('**/api/v1/profiles/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { profile: viewer } }),
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
}

test('changes the password after login and rejects the old credential', async ({ page }) => {
  let currentPassword = originalPassword;
  let changeRequests = 0;
  const pageErrors = [];

  page.on('pageerror', error => pageErrors.push(error.message));

  await installShellMocks(page);

  await page.route('**/api/v1/auth/login', async route => {
    const body = route.request().postDataJSON();
    const submitted = body?.user?.password;

    if (submitted === currentPassword) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            token: sessionToken,
            token_type: 'Bearer',
            user: viewer,
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'error', message: 'Invalid email or password' }),
    });
  });

  await page.route('**/api/v1/auth/password', async route => {
    changeRequests += 1;
    const body = route.request().postDataJSON();
    const params = body?.user || {};

    if (params.current_password !== currentPassword) {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          code: 'invalid_current_password',
          message: 'Your current password is incorrect.',
        }),
      });
      return;
    }

    currentPassword = params.password;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        message: 'Password updated successfully.',
        data: {
          token: `${sessionToken}-rotated`,
          token_type: 'Bearer',
          user: viewer,
        },
      }),
    });
  });

  const signIn = async password => {
    await page.locator('#login-email').fill(email);
    await page.locator('#login-password').fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();
  };

  await page.goto('/login');
  await signIn(originalPassword);
  await page.waitForURL('**/dashboard/search');

  await page.goto('/changepassword');
  await expect(page.getByText('Change your password', { exact: true })).toBeVisible();

  // Mismatched confirmations must be blocked before the network call.
  await page.locator('#current_password').fill(originalPassword);
  await page.locator('#password').fill(updatedPassword);
  await page.locator('#confirmPassword').fill('MismatchPassword789!');
  await page.getByTestId('change-password-submit').click();

  await expect(page.getByText('Passwords must match')).toBeVisible();
  expect(changeRequests).toBe(0);

  await page.locator('#confirmPassword').fill(updatedPassword);

  const [changeResponse] = await Promise.all([
    page.waitForResponse(
      response =>
        response.url().includes('/api/v1/auth/password') && response.request().method() === 'PUT',
    ),
    page.getByTestId('change-password-submit').click(),
  ]);

  expect(changeResponse.status()).toBe(200);
  await expect(page.getByText('Password updated successfully.')).toBeVisible();
  await expect.poll(() => changeRequests).toBe(1);

  // Full teardown of the browser session before checking credentials.
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/login');

  await signIn(originalPassword);
  await expect(
    page.getByRole('alert').filter({ hasText: 'Invalid email or password' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);

  await page.locator('#login-password').fill(updatedPassword);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/dashboard/search');

  // Restore the original password so repeated local runs stay idempotent.
  await page.goto('/changepassword');
  await page.locator('#current_password').fill(updatedPassword);
  await page.locator('#password').fill(originalPassword);
  await page.locator('#confirmPassword').fill(originalPassword);
  await page.getByTestId('change-password-submit').click();

  await expect(page.getByText('Password updated successfully.')).toBeVisible();
  await expect.poll(() => changeRequests).toBe(2);
  expect(currentPassword).toBe(originalPassword);

  expect(pageErrors).toEqual([]);
});
