import { test, expect } from '@playwright/test';

/**
 * Integration coverage for the privacy gates.
 *
 * Requires the Phoenix backend at E2E_API_URL (default http://127.0.0.1:4000)
 * and the deterministic seed dataset from `mix run priv/repo/seeds.exs`.
 */

const PASSWORD = 'Password123!';
const API_URL = (process.env.E2E_API_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');

const NEHA = {
  email: 'delhi.demo.neha@marrylocal.test',
  phone: '9800000024',
  handle: 'neha_verma',
  maskedName: 'Neha V.',
  fullName: 'Neha Verma',
};

const PRIYA = {
  email: 'bangalore.demo.priya@marrylocal.test',
};

const KABIR = {
  email: 'delhi.demo.kabir@marrylocal.test',
};

async function login(page, email, password = PASSWORD) {
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);

  const [response] = await Promise.all([
    page.waitForResponse(
      res => res.url().includes('/api/v1/auth/login') && res.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Sign In' }).click(),
  ]);

  expect(response.status()).toBe(200);
  await expect(page).toHaveURL(/\/dashboard\/search/);
}

async function logout(page) {
  await page.evaluate(() => {
    window.localStorage.removeItem('marrylocal.auth.token');
    window.localStorage.removeItem('marrylocal.auth.user');
    window.localStorage.removeItem('marrylocal.auth.shell');
  });

  await page.goto('/login');
  await expect(page.locator('#login-email')).toBeVisible();
}

async function openSettings(page) {
  await page.goto('/settings');
  await expect(page.getByText('Search & Lookup Privacy', { exact: true })).toBeVisible();
}

async function setSwitch(page, testId, desired, successToast) {
  const toggle = page.getByTestId(testId);
  await expect(toggle).toBeVisible();

  const checked = (await toggle.getAttribute('aria-checked')) === 'true';
  if (checked === desired) return;

  const [response] = await Promise.all([
    page.waitForResponse(
      res => res.url().includes('/api/v1/profiles/me') && res.request().method() === 'PATCH',
    ),
    toggle.click(),
  ]);

  expect(response.status()).toBe(200);
  await expect(toggle).toHaveAttribute('aria-checked', String(desired));
  await expect(page.getByText(successToast).first()).toBeVisible();
}

async function setLookupToggle(page, key, desired) {
  await setSwitch(page, `settings-lookup-toggle-${key}`, desired, 'Privacy setting updated');
}

async function setProfilePrivacyToggle(page, key, desired) {
  await setSwitch(page, `settings-toggle-${key}`, desired, 'Settings updated successfully!');
}

async function submitLookup(page, query) {
  await page.goto('/dashboard/search-user');
  await page.getByTestId('lookup-input').fill(query);

  const [response] = await Promise.all([
    page.waitForResponse(
      res => res.url().includes('/api/v1/profiles/lookup') && res.request().method() === 'GET',
    ),
    page.getByTestId('lookup-submit').click(),
  ]);

  return response;
}

async function expectNoMatch(page, response) {
  expect(response.status()).toBe(404);
  await expect(page.getByTestId('lookup-result')).toHaveCount(0);
  await expect(page.getByText('No matching profile found', { exact: true })).toBeVisible();
}

async function expectMatch(page, response) {
  expect(response.status()).toBe(200);
  await expect(page.getByTestId('lookup-result')).toBeVisible();
}

async function configureTargetVisibility(page, { email, phone, handle, restrict }) {
  await login(page, NEHA.email);
  await openSettings(page);

  await setLookupToggle(page, 'restrict_lookup_to_200km', restrict);
  await setLookupToggle(page, 'allow_email_search', email);
  await setLookupToggle(page, 'allow_phone_search', phone);
  await setLookupToggle(page, 'allow_handle_search', handle);
}

test.describe.serial('privacy and lookup gates', () => {
  test('Test 1: email, phone, and user handle search visibility toggles', async ({ page }) => {
    await configureTargetVisibility(page, {
      email: false,
      phone: false,
      handle: true,
      restrict: false,
    });

    await logout(page);
    await login(page, PRIYA.email);

    await expectNoMatch(page, await submitLookup(page, NEHA.email));
    await expectNoMatch(page, await submitLookup(page, NEHA.phone));

    await expectMatch(page, await submitLookup(page, `@${NEHA.handle}`));
    await expect(page.getByTestId('lookup-result')).toContainText(NEHA.maskedName);

    // Enable email lookup and retry from a fresh viewer session.
    await logout(page);
    await login(page, NEHA.email);
    await openSettings(page);
    await setLookupToggle(page, 'allow_email_search', true);

    await logout(page);
    await login(page, PRIYA.email);

    await expectMatch(page, await submitLookup(page, NEHA.email));
    await expect(page.getByTestId('lookup-result')).toContainText(NEHA.maskedName);
  });

  test('Test 2: 200 km PostGIS radius gate', async ({ page }) => {
    await configureTargetVisibility(page, {
      email: false,
      phone: false,
      handle: true,
      restrict: true,
    });

    // Bangalore is roughly 1,700 km from Delhi.
    await logout(page);
    await login(page, PRIYA.email);
    await expectNoMatch(page, await submitLookup(page, `@${NEHA.handle}`));

    // Kabir is another Delhi seed account, well inside the 200 km radius.
    await logout(page);
    await login(page, KABIR.email);
    await expectMatch(page, await submitLookup(page, `@${NEHA.handle}`));
    await expect(page.getByTestId('lookup-result')).toContainText(NEHA.maskedName);
  });

  test('Test 3: public last name anonymization', async ({ page }) => {
    await login(page, NEHA.email);
    await openSettings(page);
    await setProfilePrivacyToggle(page, 'hide_last_name', true);
    await setLookupToggle(page, 'allow_handle_search', true);

    await logout(page);
    await login(page, KABIR.email);

    await expectMatch(page, await submitLookup(page, `@${NEHA.handle}`));
    await expect(page.getByTestId('lookup-result')).toContainText(NEHA.maskedName);
    await expect(page.getByTestId('lookup-result')).not.toContainText(NEHA.fullName);

    await page.goto('/dashboard/search');
    await expect(page.getByRole('heading', { name: 'Profiles near you' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Neha V\./ })).toBeVisible();
    await expect(page.getByText(NEHA.fullName, { exact: true })).toHaveCount(0);
  });

  test('Test 4: one-time edit lock and confirmation dialog', async ({ page, request }) => {
    const stamp = `${Date.now()}`.slice(-8);
    const email = `e2e.privacy.${stamp}@marrylocal.test`;
    const handle = `e2e${stamp}`;
    const phone = `+9198${stamp}`;

    const registration = await request.post(`${API_URL}/api/v1/auth/register`, {
      data: {
        email,
        password: PASSWORD,
        password_confirmation: PASSWORD,
        first_name: 'Lock',
        last_name: 'Tester',
        phone_number: phone,
        date_of_birth: '1994-05-15',
        gender: 'Male',
        user_handle: handle,
        city: 'Delhi',
        state: 'Delhi',
        language: 'Hindi',
        religion: 'Hindu',
        community: 'Khatri',
        education_level: 'Bachelors level',
      },
    });

    expect(registration.status()).toBe(201);
    const registrationBody = await registration.json();
    const registrationToken = registrationBody.data.token;

    // Clear the terms gate without touching any one-time core field.
    const termsResponse = await request.patch(`${API_URL}/api/v1/profiles/me`, {
      headers: { authorization: `Bearer ${registrationToken}` },
      data: { terms_accepted: true },
    });
    expect(termsResponse.status()).toBe(200);

    await login(page, email);
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Your Profile' })).toBeVisible();
    await expect(page.getByTestId('profile-core-notice')).toContainText('can only be changed ONCE');

    await page.locator('#first_name').fill('Locked Updated');
    await page.getByTestId('profile-core-save').click();

    const dialog = page.getByTestId('profile-core-confirm-dialog');
    await expect(dialog).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Confirm One-Time Profile Changes' }),
    ).toBeVisible();
    await expect(dialog).toContainText('Name, Language, or Community/Caste');
    await expect(dialog).toContainText('can only be changed ONCE');

    const [response] = await Promise.all([
      page.waitForResponse(
        res => res.url().includes('/api/v1/profiles/me') && res.request().method() === 'PATCH',
      ),
      page.getByTestId('profile-core-confirm-save').click(),
    ]);
    expect(response.status()).toBe(200);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Your Profile' })).toBeVisible();

    await expect(page.locator('#first_name')).toHaveValue('Locked Updated');
    await expect(page.locator('#first_name')).toBeDisabled();
    await expect(page.locator('#last_name')).toBeDisabled();
    await expect(page.locator('#language')).toBeDisabled();
    await expect(page.locator('#community')).toBeDisabled();

    await expect(page.locator('#education_level')).toBeEnabled();
    await expect(page.locator('#religion')).toBeEnabled();
    await expect(page.locator('#job_status')).toBeEnabled();
  });
});
