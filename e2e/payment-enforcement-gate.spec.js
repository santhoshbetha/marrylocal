import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const PASSWORD = 'Password123!';
const API_URL = (process.env.E2E_API_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
const ADMIN_EMAIL = 'admin.santhosh@marrylocal.test';
const FEE_EMAIL = 'delhi.fee.test@marrylocal.test';

const BACKEND_DIR = path.resolve(process.cwd(), '..', 'marrylocal-elixir');
const SETUP_SCRIPT = path.join(os.tmpdir(), 'e2e-payment-enforce-setup.exs');

const setupSource = `
alias Marrylocal.{Accounts, Repo}
alias Marrylocal.Accounts.User
alias Marrylocal.Geo

fee = Repo.get_by!(User, email: "${FEE_EMAIL}")

updated =
  fee
  |> Ecto.Changeset.change(%{
    onetime_fees_required: true,
    onetime_fees_paid: false,
    terms_accepted: true,
    email_verified: true,
    last_payment_at: nil,
    date_of_last_payment: nil,
    referral_credits_count: 2,
    city: "Delhi",
    state: "Delhi",
    latitude: 28.6139,
    longitude: 77.2090,
    location: Geo.point(28.6139, 77.2090)
  })
  |> Repo.update!()

case Accounts.evaluate_gating(updated) do
  {:ok, evaluated} ->
    IO.puts("E2E_PAYMENT_READY required=#{evaluated.onetime_fees_required}")

  _ ->
    raise "Could not evaluate payment seed user"
end
`;

function runBackendScript(source, scriptPath) {
  fs.writeFileSync(scriptPath, source, 'utf8');
  execSync(`mix run "${scriptPath}"`, {
    cwd: BACKEND_DIR,
    stdio: 'pipe',
    timeout: 120_000,
  });
}

async function apiLoginToken(email) {
  const response = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ user: { email, password: PASSWORD } }),
  });

  expect(response.status).toBe(200);
  const body = await response.json();
  return body.data.token;
}

async function setPaymentGateThroughApi(value) {
  const token = await apiLoginToken(ADMIN_EMAIL);

  const response = await fetch(`${API_URL}/api/v1/admin/settings/gating`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ enforce_payment_gate: value }),
  });

  expect(response.status).toBe(200);
}

async function updateFeeUser(updates) {
  const token = await apiLoginToken(ADMIN_EMAIL);

  const lookup = await fetch(
    `${API_URL}/api/v1/admin/users/lookup?query=${encodeURIComponent(FEE_EMAIL)}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  expect(lookup.status).toBe(200);
  const target = (await lookup.json()).data.user;

  const response = await fetch(`${API_URL}/api/v1/admin/users/${target.id}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  expect(response.status).toBe(200);
  return (await response.json()).data.user;
}

async function login(page, email, expectedUrl = /\/dashboard\/search/) {
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
  await expect(page).toHaveURL(expectedUrl);
  return response;
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

async function setPaymentGateThroughAdminUi(page, desired) {
  await login(page, ADMIN_EMAIL, /\/admin$/);
  await expect(page.getByText('Platform Payment Enforcement')).toBeVisible();

  const toggle = page.getByTestId('admin-payment-gate');
  await expect(toggle).toBeEnabled();

  const current = (await toggle.getAttribute('aria-checked')) === 'true';
  if (current === desired) return;

  const [response] = await Promise.all([
    page.waitForResponse(
      res => res.url().includes('/api/v1/admin/settings') && res.request().method() === 'PATCH',
    ),
    toggle.click(),
  ]);

  expect(response.status()).toBe(200);
  await expect(toggle).toHaveAttribute('aria-checked', String(desired));
}

async function authToken(page) {
  const token = await page.evaluate(() => window.localStorage.getItem('marrylocal.auth.token'));
  expect(token).toBeTruthy();
  return token;
}

test.describe.serial('payment enforcement gate', () => {
  test.beforeAll(async () => {
    runBackendScript(setupSource, SETUP_SCRIPT);
    await setPaymentGateThroughApi(false);
  });

  test.afterAll(async () => {
    try {
      await updateFeeUser({
        one_time_fees_paid: false,
        one_time_fees_required: true,
        last_fee_paid_at: null,
      });
    } finally {
      await setPaymentGateThroughApi(false);
    }
  });

  test('Test 1: master switch OFF leaves fee-required users unlocked', async ({ page }) => {
    await setPaymentGateThroughAdminUi(page, false);
    await logout(page);

    const loginResponse = await login(page, FEE_EMAIL);
    const loginBody = await loginResponse.json();
    expect(loginBody.data.user.effective_payment_required).toBe(false);

    await expect(page.getByRole('link', { name: 'Service Fees' })).toHaveCount(0);

    const discoveryResponse = page.waitForResponse(
      res => res.url().includes('/api/v1/profiles/discovery') && res.request().method() === 'GET',
    );

    await page.goto('/dashboard/search');
    expect((await discoveryResponse).status()).toBe(200);

    await expect(page.getByTestId('payment-gate-banner')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Apply' })).toBeEnabled();
    await expect(page.getByTestId('profile-card').first()).toBeVisible();
  });

  test('Test 2: master switch ON enforces the fee and exposes Service Fees', async ({ page }) => {
    await setPaymentGateThroughAdminUi(page, true);
    await logout(page);

    const loginResponse = await login(page, FEE_EMAIL);
    const loginBody = await loginResponse.json();
    expect(loginBody.data.user.effective_payment_required).toBe(true);

    await expect(page.getByRole('link', { name: 'Service Fees' })).toBeVisible();

    await page.goto('/dashboard/search');

    await expect(page.getByTestId('payment-gate-banner')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Annual Service Fee Required' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Apply' })).toBeDisabled();

    const token = await authToken(page);
    const blocked = await page.request.get(`${API_URL}/api/v1/profiles/discovery`, {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(blocked.status()).toBe(403);
    const blockedBody = await blocked.json();
    expect(blockedBody.code).toBe('PAYMENT_REQUIRED');
    expect(blockedBody.message).toBe(
      'Annual service fee payment is required to continue searching.',
    );

    await page.getByRole('link', { name: 'Complete Service Fee Payment →' }).click();
    await expect(page).toHaveURL(/\/dashboard\/servicefees$/);

    await expect(page.getByText('Annual Service Fees', { exact: true })).toBeVisible();
    await expect(page.getByText('Base service fee')).toBeVisible();
    await expect(page.getByText(/Referral credits/)).toBeVisible();
    await expect(page.getByText('GST at 18%')).toBeVisible();
  });

  test('Test 3: paid status unlocks and a 366-day-old payment re-locks on login', async ({
    page,
  }) => {
    const recent = new Date().toISOString();
    await updateFeeUser({
      one_time_fees_paid: true,
      one_time_fees_required: true,
      last_fee_paid_at: recent,
    });

    const paidLogin = await login(page, FEE_EMAIL);
    const paidBody = await paidLogin.json();
    expect(paidBody.data.user.effective_payment_required).toBe(false);

    await expect(page.getByRole('link', { name: 'Service Fees' })).toHaveCount(0);

    const unlockedDiscovery = page.waitForResponse(
      res => res.url().includes('/api/v1/profiles/discovery') && res.request().method() === 'GET',
    );
    await page.goto('/dashboard/search');
    expect((await unlockedDiscovery).status()).toBe(200);
    await expect(page.getByRole('button', { name: 'Apply' })).toBeEnabled();

    await logout(page);

    const expired = new Date(Date.now() - 366 * 24 * 60 * 60 * 1000).toISOString();
    await updateFeeUser({
      one_time_fees_paid: true,
      one_time_fees_required: true,
      last_fee_paid_at: expired,
    });

    const expiredLogin = await login(page, FEE_EMAIL);
    const expiredBody = await expiredLogin.json();
    expect(expiredBody.data.user.effective_payment_required).toBe(true);

    const token = await authToken(page);
    const profileResponse = await page.request.get(`${API_URL}/api/v1/profiles/me`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(profileResponse.status()).toBe(200);
    expect((await profileResponse.json()).data.profile.onetime_fees_paid).toBe(false);

    await expect(page.getByRole('link', { name: 'Service Fees' })).toBeVisible();
  });
});
