import { test, expect } from '@playwright/test';

const sessionToken = 'e2e-signup-bearer-token';

const profile = {
  id: 501,
  email: 'placeholder@marrylocal.test',
  first_name: 'E2E',
  last_name: 'Signup',
  user_handle: 'e2e_signup',
  shortid: 'signup501',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
  email_verified: false,
  onboarding_complete: false,
  images: [],
  avatar_url: null,
};

async function installShellMocks(page) {
  await page.route('**/api/v1/profiles/me', async route => {
    if (route.request().method() === 'PATCH') {
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
      body: JSON.stringify({ status: 'success', data: { profile } }),
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

test('completes the full signup flow with cascading location and cultural fields', async ({
  page,
}) => {
  const email = `e2e.signup.${Date.now()}@marrylocal.test`;
  const password = 'Password123!';
  const pageErrors = [];
  let registerPayload = null;

  page.on('pageerror', error => pageErrors.push(error.message));

  await installShellMocks(page);

  await page.route('**/api/v1/auth/register', async route => {
    registerPayload = route.request().postDataJSON();

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          token: sessionToken,
          token_type: 'Bearer',
          user: { ...profile, email },
        },
      }),
    });
  });

  await page.goto('/signup');

  await page.locator('#first_name').fill('E2E');
  await page.locator('#last_name').fill('Signup');
  await page.locator('#email').fill(email);
  await page.locator('#phone_number').fill('9876501234');
  await page.locator('#password').fill(password);
  await page.locator('#password_confirmation').fill(password);
  await page.locator('#gender').selectOption('Female');
  await page.locator('#date_of_birth').fill('1995-01-01');
  await page.locator('#religion').selectOption('Hindu');
  await page.locator('#community').selectOption('Brahmin Smartha');
  await page.locator('#caste').fill('Smartha');
  await page.locator('#language').selectOption('Kannada');

  // State drives the dependent city option set.
  await expect(page.getByTestId('city-select')).toBeDisabled();
  await page.getByTestId('state-select').selectOption('Karnataka');
  await expect(page.getByTestId('city-select')).toBeEnabled();
  await expect(page.getByTestId('city-select').locator('option[value="Bangalore"]')).toHaveCount(1);
  await page.getByTestId('city-select').selectOption('Bangalore');
  await expect(page.getByTestId('city-select')).toHaveValue('Bangalore');

  await page.locator('#education_level').selectOption('Bachelors level');
  await page.locator('#economic_status').selectOption('Middleclass');
  await page.getByTestId('signup-job-status').click();
  await expect(page.getByText('Currently employed')).toBeVisible();
  await page.locator('#referred_by_code').fill('ML72FADB');
  await page.locator('#bio').fill('Automated signup profile for the end-to-end suite.');

  const [registrationResponse] = await Promise.all([
    page.waitForResponse(
      response =>
        response.url().includes('/api/v1/auth/register') && response.request().method() === 'POST',
    ),
    page.getByTestId('signup-submit').click(),
  ]);

  expect(registrationResponse.status()).toBe(201);

  expect(registerPayload).toMatchObject({
    first_name: 'E2E',
    last_name: 'Signup',
    email,
    phone_number: '9876501234',
    gender: 'Female',
    date_of_birth: '1995-01-01',
    religion: 'Hindu',
    community: 'Brahmin Smartha',
    caste: 'Smartha',
    language: 'Kannada',
    state: 'Karnataka',
    city: 'Bangalore',
    education_level: 'Bachelors level',
    economic_status: 'Middleclass',
    job_status: true,
    referred_by_code: 'ML72FADB',
  });

  await expect(page.getByText('Account created. Let us tune your local matches.')).toBeVisible();
  await page.waitForURL('**/onboarding/lifestyle');

  expect(await page.evaluate(() => window.localStorage.getItem('marrylocal.auth.token'))).toBe(
    sessionToken,
  );

  // The dedicated verification prompt remains reachable after registration.
  await page.goto('/registration-success');
  await expect(page.getByRole('heading', { name: 'Registration successful' })).toBeVisible();
  await expect(page.getByText('Next step: verify your email')).toBeVisible();

  expect(pageErrors).toEqual([]);
});
