import { test, expect } from '@playwright/test';

const email = 'delhi.demo.neha@marrylocal.test';
const originalPassword = 'Password123!';
const updatedPassword = 'NewPassword456!';
const sessionToken = 'e2e-forgot-password-token';

const viewer = {
  id: 503,
  email,
  first_name: 'Neha',
  last_name: 'Verma',
  user_handle: 'neha_demo',
  shortid: 'neha503',
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

test('requests a reset link, completes the token reset, and signs in with the new password', async ({
  page,
}) => {
  let currentPassword = originalPassword;
  let forgotPayload = null;
  const pageErrors = [];

  page.on('pageerror', error => pageErrors.push(error.message));

  await installShellMocks(page);

  await page.route('**/api/v1/auth/forgot-password', async route => {
    forgotPayload = route.request().postDataJSON();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'If an account exists, instructions have been sent.',
      }),
    });
  });

  await page.route('**/api/v1/auth/reset-password/**', async route => {
    const body = route.request().postDataJSON();
    currentPassword = body?.user?.password || currentPassword;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Password reset successfully.' }),
    });
  });

  await page.route('**/api/v1/auth/login', async route => {
    const body = route.request().postDataJSON();

    if (body?.user?.password === currentPassword) {
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

  await page.goto('/login');
  await page.getByRole('link', { name: 'Forgot password?' }).click();

  await expect(page).toHaveURL(/\/forgot-password$/);
  await page.locator('#email').fill(email);

  const [forgotResponse] = await Promise.all([
    page.waitForResponse(
      response =>
        response.url().includes('/api/v1/auth/forgot-password') &&
        response.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Send reset link' }).click(),
  ]);

  expect(forgotResponse.status()).toBe(200);
  expect(forgotPayload).toEqual({ email });

  await expect(page.getByText('If an account exists, a reset link has been sent.')).toBeVisible();
  await expect(
    page.getByText('Check your inbox for the secure reset link. It expires in one hour.'),
  ).toBeVisible();

  await page.goto('/reset-password?token=e2e-reset-token');
  await expect(page.getByText('Choose a new password', { exact: true })).toBeVisible();

  await page.locator('#password').fill(updatedPassword);
  await page.locator('#confirmPassword').fill(updatedPassword);

  const [resetResponse] = await Promise.all([
    page.waitForResponse(
      response =>
        response.url().includes('/api/v1/auth/reset-password/') &&
        response.request().method() === 'PUT',
    ),
    page.getByTestId('change-password-submit').click(),
  ]);

  expect(resetResponse.status()).toBe(200);
  await expect(page.getByText('Password updated. Please sign in again.')).toBeVisible();
  await page.waitForURL('**/login');

  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(updatedPassword);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL('**/dashboard/search');
  expect(await page.evaluate(() => window.localStorage.getItem('marrylocal.auth.token'))).toBe(
    sessionToken,
  );
  expect(pageErrors).toEqual([]);
});
