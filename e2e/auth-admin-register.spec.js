import { test, expect } from '@playwright/test';

const VALID_INVITE_CODE = process.env.ADMIN_INVITE_CODE || 'TEST_ADMIN_INVITE_123';

async function fillCoreFields(
  page,
  { phone = '9876543210', confirmPassword = 'Password123!' } = {},
) {
  await page.locator('#firstname').fill('E2E');
  await page.locator('#lastname').fill('Admin');
  await page.locator('#dateofbirth').fill('1990-01-01');

  await page.locator('#gender').click();
  await page.getByRole('option', { name: 'Female' }).click();

  await page.locator('#email').fill('e2e.admin.placeholder@marrylocal.test');
  await page.locator('#phonenumber').fill(phone);
  await page.locator('#password').fill('Password123!');
  await page.locator('#confirmPassword').fill(confirmPassword);
  await page.locator('#inviteCode').fill('WRONG_CODE_123');
}

test('validates the form client-side and rejects an invalid invite code', async ({ page }) => {
  let requestCount = 0;

  await page.route('**/api/v1/auth/admin-register', async route => {
    requestCount += 1;

    await route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'error',
        code: 'invalid_invite_code',
        message: 'The admin invite code is invalid.',
      }),
    });
  });

  await page.goto('/admin/register');
  await expect(page.getByText('Admin Registration', { exact: true })).toBeVisible();

  await fillCoreFields(page, { phone: '12345', confirmPassword: 'Different123!' });
  await page.getByTestId('admin-register-submit').click();

  await expect(page.getByText('Phone number must be exactly 10 digits')).toBeVisible();
  await expect(page.getByText('Passwords must match')).toBeVisible();

  // Client-side validation must not reach the API.
  expect(requestCount).toBe(0);

  await page.locator('#phonenumber').fill('9876543210');
  await page.locator('#confirmPassword').fill('Password123!');
  await page.getByTestId('admin-register-submit').click();

  await expect(page.getByRole('alert')).toContainText('The admin invite code is invalid.');
  await expect.poll(() => requestCount).toBe(1);
  await expect(page).toHaveURL(/\/admin\/register$/);
});

test('registers an admin successfully and redirects to login', async ({ page }) => {
  const timestamp = Date.now();
  const email = `e2e.admin.${timestamp}@marrylocal.test`;
  const phone = `9${String(timestamp).slice(-9)}`;
  let payload = null;

  await page.route('**/api/v1/auth/admin-register', async route => {
    payload = route.request().postDataJSON();

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        message: 'Admin account created. Check your email to verify the address before signing in.',
        data: {
          user: {
            id: 901,
            email,
            role: 'admin',
            user_state: 'active',
            email_verified: false,
          },
        },
      }),
    });
  });

  await page.goto('/admin/register');

  await page.locator('#firstname').fill('E2E');
  await page.locator('#lastname').fill('Admin');
  await page.locator('#dateofbirth').fill('1990-01-01');

  await page.locator('#gender').click();
  await page.getByRole('option', { name: 'Female' }).click();

  await page.locator('#email').fill(email);
  await page.locator('#phonenumber').fill(phone);
  await page.locator('#password').fill('Password123!');
  await page.locator('#confirmPassword').fill('Password123!');
  await page.locator('#inviteCode').fill(VALID_INVITE_CODE);

  const [response] = await Promise.all([
    page.waitForResponse(
      res => res.url().includes('/api/v1/auth/admin-register') && res.request().method() === 'POST',
    ),
    page.getByTestId('admin-register-submit').click(),
  ]);

  expect(response.status()).toBe(201);

  expect(payload).toEqual({
    first_name: 'E2E',
    last_name: 'Admin',
    birth_date: '1990-01-01',
    gender: 'Female',
    email,
    phone_number: phone,
    password: 'Password123!',
    invite_code: VALID_INVITE_CODE,
  });

  await expect(page.getByText(/Admin registration successful/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
