import { test, expect } from '@playwright/test';

/**
 * End-to-end coverage for the member Terms & Conditions gate.
 *
 * Requires the Phoenix API at E2E_API_URL and the seeded admin account.
 * The suite registers its own timestamped member so it can verify the
 * first-login, repeat-login, and accepted-session transitions without
 * depending on mutable seed rows.
 */

const PASSWORD = 'Password123!';
const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173';
const API_URL = (process.env.E2E_API_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
const ADMIN_EMAIL = 'admin.santhosh@marrylocal.test';
const EXPECTED_FEE = Number(process.env.DEFAULT_ANNUAL_FEE_INR || 500);

const stamp = Date.now();
const MEMBER = {
  email: `e2e.terms.${stamp}@marrylocal.test`,
  password: PASSWORD,
  password_confirmation: PASSWORD,
  first_name: 'Terms',
  last_name: 'Member',
  phone_number: `98${String(stamp).slice(-8)}`,
  date_of_birth: '1994-05-15',
  gender: 'Male',
  user_handle: `term${String(stamp).slice(-8)}`,
  city: 'Delhi',
  state: 'Delhi',
  language: 'Hindi',
  religion: 'Hindu',
  community: 'Khatri',
  education_level: 'Bachelors level',
};

const state = {
  token: null,
  userId: null,
  acceptedStorage: null,
};

function jsonHeaders(token) {
  return {
    'content-type': 'application/json',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function apiLoginToken(email) {
  const response = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ user: { email, password: PASSWORD } }),
  });

  expect(response.status).toBe(200);
  const body = await response.json();
  return body.data.token;
}

async function resetGates() {
  const adminToken = await apiLoginToken(ADMIN_EMAIL);

  const response = await fetch(`${API_URL}/api/v1/admin/settings/gating`, {
    method: 'PATCH',
    headers: jsonHeaders(adminToken),
    body: JSON.stringify({
      enforce_verification_gate: false,
      enforce_payment_gate: false,
    }),
  });

  expect(response.status).toBe(200);
  return adminToken;
}

async function verifyMemberThroughAdmin(adminToken) {
  const lookup = await fetch(
    `${API_URL}/api/v1/admin/users/lookup?query=${encodeURIComponent(MEMBER.email)}`,
    { headers: jsonHeaders(adminToken) },
  );

  expect(lookup.status).toBe(200);
  const lookupBody = await lookup.json();
  const target = lookupBody.data.user;
  state.userId = target.id;

  const update = await fetch(`${API_URL}/api/v1/admin/users/${target.id}`, {
    method: 'PATCH',
    headers: jsonHeaders(adminToken),
    body: JSON.stringify({
      email_verified: true,
      terms_accepted: false,
    }),
  });

  expect(update.status).toBe(200);
  const updateBody = await update.json();

  expect(updateBody.data.user.email_verified).toBe(true);
  expect(updateBody.data.user.terms_accepted).toBe(false);
}

async function login(page, email = MEMBER.email) {
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(PASSWORD);

  const [response] = await Promise.all([
    page.waitForResponse(
      res => res.url().includes('/api/v1/auth/login') && res.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Sign In' }).click(),
  ]);

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.data.user.email).toBe(email);

  await expect(page).toHaveURL(/\/dashboard\/search$/);
  return body;
}

async function logoutCompletely(page) {
  const token = await page.evaluate(() => window.localStorage.getItem('marrylocal.auth.token'));

  if (token) {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    }).catch(() => {});
  }

  await page.evaluate(() => {
    window.localStorage.removeItem('marrylocal.auth.token');
    window.localStorage.removeItem('marrylocal.auth.user');
    window.localStorage.removeItem('marrylocal.auth.shell');
  });

  await page.goto('/login');
  await expect(page.locator('#login-email')).toBeVisible();
}

async function expectNoTermsGate(page) {
  await expect(page.getByRole('heading', { name: 'Welcome to MarryLocal' })).toHaveCount(0);
}

async function expectCardBackdrop(page, title) {
  const card = page
    .getByText(title, { exact: true })
    .locator('xpath=ancestor::*[@data-slot="card"][1]');

  await expect(card).toBeVisible();

  const background = await card.evaluate(element => getComputedStyle(element).backgroundColor);
  expect(background).not.toBe('rgba(0, 0, 0, 0)');
  expect(background).not.toBe('transparent');
}

test.describe.serial('terms acceptance gate', () => {
  test.beforeAll(async () => {
    const registration = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(MEMBER),
    });

    expect(registration.status).toBe(201);
    const registrationBody = await registration.json();

    state.token = registrationBody.data.token;
    expect(state.token).toBeTruthy();

    const profileResponse = await fetch(`${API_URL}/api/v1/profiles/me`, {
      headers: { authorization: `Bearer ${state.token}` },
    });

    expect(profileResponse.status).toBe(200);
    const profileBody = await profileResponse.json();
    const profile = profileBody.data.profile;

    expect(profile.email).toBe(MEMBER.email);
    expect(profile.terms_accepted).toBe(false);
    expect(profile.accepted_one_time_fees_amount).toBe(EXPECTED_FEE);

    const adminToken = await resetGates();
    await verifyMemberThroughAdmin(adminToken);
  });

  test('Test 1: first login forces the gate and declining logs out immediately', async ({
    page,
  }) => {
    await login(page);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Welcome to MarryLocal' })).toBeVisible();
    await expect(dialog).toHaveAttribute('data-state', 'open');

    await expect(dialog.getByText(/₹500 INR/)).toBeVisible();
    await expect(dialog.getByText(/250 members/)).toBeVisible();
    await expect(dialog.getByText(/verified referral/i)).toBeVisible();
    expect(await dialog.innerText()).not.toMatch(/chat/i);

    // Escape is blocked by the dialog contract.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'I DO NOT AGREE' }).click();
    await page.waitForURL(url => ['/', '/login'].includes(url.pathname));

    const session = await page.evaluate(() => ({
      token: window.localStorage.getItem('marrylocal.auth.token'),
      user: window.localStorage.getItem('marrylocal.auth.user'),
    }));

    expect(session.token).toBeNull();
    expect(session.user).toBeNull();

    // Direct dashboard access must not re-open an authenticated shell.
    await page.goto('/dashboard/search');
    await expect(page).not.toHaveURL(/\/dashboard\/search/);
    await expect(page).toHaveURL(url => ['/', '/login'].includes(url.pathname));

    const tokenAfterDirectNav = await page.evaluate(() =>
      window.localStorage.getItem('marrylocal.auth.token'),
    );
    expect(tokenAfterDirectNav).toBeNull();
  });

  test('Test 2: second login re-triggers the gate until accepted', async ({ page }) => {
    await login(page);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Welcome to MarryLocal' })).toBeVisible();

    await dialog.getByRole('checkbox').check();

    const [response] = await Promise.all([
      page.waitForResponse(
        res => res.url().includes('/api/v1/profiles/me') && res.request().method() === 'PATCH',
      ),
      dialog.getByRole('button', { name: 'I AGREE' }).click(),
    ]);

    expect(response.status()).toBe(200);
    expect(response.request().postDataJSON()).toEqual({ terms_accepted: true });

    await expect(page.getByRole('heading', { name: 'Welcome to MarryLocal' })).toHaveCount(0);
    await expect(page).toHaveURL(/\/dashboard\/search$/);

    const persisted = await page.evaluate(() =>
      window.localStorage.getItem('marrylocal.auth.user'),
    );
    expect(persisted).toContain('"terms_accepted":true');

    // Capture the accepted browser session so the next test can verify that a
    // real reload of the same persisted session bypasses the gate.
    state.acceptedStorage = await page.context().storageState();
  });

  test('Test 3: accepted sessions bypass the gate on reload and later logins', async ({
    browser,
  }) => {
    expect(state.acceptedStorage).toBeTruthy();

    const context = await browser.newContext({
      baseURL: BASE_URL,
      storageState: state.acceptedStorage,
    });
    const page = await context.newPage();

    try {
      await page.goto('/dashboard/search');
      await expect(page).toHaveURL(/\/dashboard\/search$/);
      await page.waitForTimeout(400);
      await expectNoTermsGate(page);

      await page.reload();
      await expect(page).toHaveURL(/\/dashboard\/search$/);
      await page.waitForTimeout(400);
      await expectNoTermsGate(page);

      await logoutCompletely(page);
      await login(page);
      await page.waitForTimeout(400);
      await expect(page).toHaveURL(/\/dashboard\/search$/);
      await expectNoTermsGate(page);

      // Public legal surfaces must work without a session and in dark mode.
      await logoutCompletely(page);
      await page.addInitScript(() => {
        window.localStorage.setItem('theme-mode', 'dark');
        window.localStorage.setItem('dark-variant', 'amber');
      });

      await page.goto('/terms');
      await expect(page.locator('html')).toHaveClass(/dark/);
      await expectCardBackdrop(page, 'Terms and Conditions');
      await expect(page.getByText(/₹500 INR/).first()).toBeVisible();
      await expect(page.getByText(/250 members/).first()).toBeVisible();
      expect(await page.locator('body').innerText()).not.toMatch(/chat/i);

      await page.goto('/privacy');
      await expect(page.locator('html')).toHaveClass(/dark/);
      await expectCardBackdrop(page, 'Privacy Policy');
      await expect(page.getByText(/fuzzed by up to approximately 5 km/)).toBeVisible();
      await expect(page.getByText(/Exact GPS coordinates are never stored/)).toBeVisible();
      await expect(page.getByText(/persist only the integer age/)).toBeVisible();
      await expect(page.getByText(/raw birth date is discarded/)).toBeVisible();
      expect(await page.locator('body').innerText()).not.toMatch(/chat/i);
    } finally {
      await context.close();
    }
  });
});
