import { test, expect } from '@playwright/test';

const loginToken = 'e2e-login-bearer-token';
const verificationToken = 'e2e-verification-bearer-token';

function user(email, overrides = {}) {
  return {
    id: 303,
    email,
    user_handle: 'asha_rao',
    shortid: 'asha303',
    first_name: 'Asha',
    firstname: 'Asha',
    last_name: 'Rao',
    lastname: 'Rao',
    role: 'user',
    user_state: 'active',
    userstate: 'active',
    terms_accepted: true,
    termsaccepted: true,
    email_verified: true,
    onboarding_complete: true,
    images: [],
    ...overrides,
  };
}

async function installDashboardMocks(page) {
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
}

test.describe('consolidated authentication suite', () => {
  test('validates the email format before submitting credentials', async ({ page }) => {
    let loginRequests = 0;

    await page.route('**/api/v1/auth/login', async route => {
      loginRequests += 1;
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'error', message: 'Invalid email or password' }),
      });
    });

    await page.goto('/login');
    await page.locator('#login-email').fill('not-an-email');
    await page.locator('#login-password').fill('valid-password');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid email format')).toBeVisible();
    expect(loginRequests).toBe(0);
  });

  test('posts nested credentials, stores the bearer token, and lands on discovery', async ({
    page,
  }) => {
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    const credentials = {
      email: 'login@example.com',
      password: 'MarryLocal#2026',
    };
    let loginPayload = null;

    await installDashboardMocks(page);

    await page.route('**/api/v1/auth/login', async route => {
      loginPayload = route.request().postDataJSON();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            token: loginToken,
            token_type: 'Bearer',
            user: user(credentials.email),
          },
        }),
      });
    });

    await page.goto('/login');
    await page.locator('#login-email').fill(credentials.email);
    await page.locator('#login-password').fill(credentials.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('**/dashboard/search');

    expect(loginPayload).toEqual({
      user: { email: credentials.email, password: credentials.password },
    });

    const storedToken = await page.evaluate(() =>
      window.localStorage.getItem('marrylocal.auth.token'),
    );
    expect(storedToken).toBe(loginToken);
    expect(pageErrors).toEqual([]);
  });

  test('verifies an emailed token, persists the fresh session, and opens profile setup', async ({
    page,
  }) => {
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    const confirmationToken = 'single-use-confirmation-token';
    let verifyPayload = null;

    await page.route('**/api/v1/auth/verify-email', async route => {
      verifyPayload = route.request().postDataJSON();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          message: 'Email verified successfully.',
          data: {
            token: verificationToken,
            token_type: 'Bearer',
            user: user('verified@example.com', { onboarding_complete: false }),
          },
        }),
      });
    });

    await page.goto(`/verify-email?token=${confirmationToken}`);
    await page.waitForURL('**/onboarding/lifestyle');

    expect(verifyPayload).toEqual({ token: confirmationToken });

    const storedToken = await page.evaluate(() =>
      window.localStorage.getItem('marrylocal.auth.token'),
    );
    expect(storedToken).toBe(verificationToken);
    expect(pageErrors).toEqual([]);
  });
});
