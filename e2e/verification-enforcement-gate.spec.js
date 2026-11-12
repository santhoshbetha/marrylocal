import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const PASSWORD = 'Password123!';
const API_URL = (process.env.E2E_API_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
const ADMIN_EMAIL = 'admin.santhosh@marrylocal.test';
const USER_EMAIL = 'delhi.demo.neha@marrylocal.test';

const BACKEND_DIR = path.resolve(process.cwd(), '..', 'marrylocal-elixir');
const SETUP_SCRIPT = path.join(os.tmpdir(), 'e2e-verification-enforce-setup.exs');
const CLEANUP_SCRIPT = path.join(os.tmpdir(), 'e2e-verification-enforce-cleanup.exs');

const setupSource = `
alias Marrylocal.{Accounts, Repo}
alias Marrylocal.Accounts.User
alias Marrylocal.Geo
import Ecto.Query

now = DateTime.utc_now() |> DateTime.truncate(:second)
old = DateTime.add(now, -10, :day)

Repo.delete_all(from u in User, where: like(u.email, "e2e.gate.%@marrylocal.test"))

neha = Repo.get_by!(User, email: "${USER_EMAIL}")
lat = neha.latitude || 28.6139
lng = neha.longitude || 77.2090

neha =
  neha
  |> Ecto.Changeset.change(%{
    inserted_at: old,
    aadhar_verified: false,
    passport_verified: false,
    license_verified: false,
    force_verification_required: false
  })
  |> Repo.update!()

for index <- 1..55 do
  %User{
    email: "e2e.gate.#{index}@marrylocal.test",
    phone_number: "+9195#{String.pad_leading(Integer.to_string(index), 8, "0")}",
    first_name: "Gate",
    last_name: "Nearby",
    user_handle: "e2e_gate_#{index}",
    referral_code: "EGATE#{String.pad_leading(Integer.to_string(index), 6, "0")}",
    gender: "Male",
    user_state: :active,
    city: neha.city || "Delhi",
    state: neha.state || "Delhi",
    latitude: lat,
    longitude: lng,
    location: Geo.point(lat, lng),
    inserted_at: now,
    updated_at: now
  }
  |> Repo.insert!()
end

{:ok, evaluated} = Accounts.evaluate_gating(neha)
IO.puts("E2E_GATE_READY around=#{evaluated.around_user_count}")
`;

const cleanupSource = `
alias Marrylocal.{Accounts, Repo}
alias Marrylocal.Accounts.User
import Ecto.Query

now = DateTime.utc_now() |> DateTime.truncate(:second)

Repo.delete_all(from u in User, where: like(u.email, "e2e.gate.%@marrylocal.test"))

case Repo.get_by(User, email: "${USER_EMAIL}") do
  nil ->
    :ok

  neha ->
    neha
    |> Ecto.Changeset.change(%{
      inserted_at: now,
      aadhar_verified: false,
      passport_verified: false,
      license_verified: false,
      force_verification_required: false
    })
    |> Repo.update!()
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

async function setGateThroughApi(value) {
  const token = await apiLoginToken(ADMIN_EMAIL);

  const response = await fetch(`${API_URL}/api/v1/admin/settings`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ enforce_verification_gate: value }),
  });

  expect(response.status).toBe(200);
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

async function setGateThroughAdminUi(page, desired) {
  await login(page, ADMIN_EMAIL, /\/admin$/);
  await expect(page.getByText('Platform Verification Enforcement')).toBeVisible();

  const toggle = page.getByTestId('admin-verification-gate');
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
  await expect(page.getByText(desired ? 'Enabled' : 'Disabled', { exact: true })).toBeVisible();
}

async function authToken(page) {
  const token = await page.evaluate(() => window.localStorage.getItem('marrylocal.auth.token'));
  expect(token).toBeTruthy();
  return token;
}

test.describe.serial('verification enforcement gate', () => {
  test.beforeAll(async () => {
    runBackendScript(setupSource, SETUP_SCRIPT);
    await setGateThroughApi(false);
  });

  test.afterAll(async () => {
    try {
      await setGateThroughApi(false);
    } finally {
      runBackendScript(cleanupSource, CLEANUP_SCRIPT);
    }
  });

  test('Test 1: global switch OFF leaves discovery unlocked', async ({ page }) => {
    await setGateThroughAdminUi(page, false);
    await logout(page);

    await login(page, USER_EMAIL);
    await page.goto('/dashboard/search');

    const initialDiscovery = page.waitForResponse(
      res => res.url().includes('/api/v1/profiles/discovery') && res.request().method() === 'GET',
    );
    await page.reload();
    expect((await initialDiscovery).status()).toBe(200);

    await expect(page.getByTestId('verification-gate-banner')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Apply' })).toBeEnabled();
    await expect(page.getByTestId('profile-card').first()).toBeVisible();
  });

  test('Test 2: global switch ON re-evaluates login gating and locks search', async ({ page }) => {
    await setGateThroughAdminUi(page, true);
    await logout(page);

    const loginResponse = await login(page, USER_EMAIL);
    const loginBody = await loginResponse.json();

    expect(loginBody.data.user.force_verification_required).toBe(true);
    expect(loginBody.data.user.around_user_count).toBeGreaterThan(50);

    await page.goto('/dashboard/search');

    await expect(page.getByTestId('verification-gate-banner')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Identity Verification Required' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Apply' })).toBeDisabled();

    const token = await authToken(page);
    const blocked = await page.request.get(`${API_URL}/api/v1/profiles/discovery`, {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(blocked.status()).toBe(403);
    const blockedBody = await blocked.json();
    expect(blockedBody.code).toBe('VERIFICATION_REQUIRED');
    expect(blockedBody.message).toBe(
      'Identity verification is required to continue searching in your area.',
    );

    await page.getByRole('link', { name: 'Verify Profile Now →' }).click();
    await expect(page).toHaveURL(/\/verify$/);
  });

  test('Test 3: verified user bypasses the gate while switch remains ON', async ({ page }) => {
    const adminToken = await apiLoginToken(ADMIN_EMAIL);

    const lookupResponse = await fetch(
      `${API_URL}/api/v1/admin/users/lookup?query=${encodeURIComponent(USER_EMAIL)}`,
      { headers: { authorization: `Bearer ${adminToken}` } },
    );
    expect(lookupResponse.status).toBe(200);
    const target = (await lookupResponse.json()).data.user;

    const verifyResponse = await fetch(`${API_URL}/api/v1/admin/users/${target.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ aadhaar_verified: true }),
    });
    expect(verifyResponse.status).toBe(200);

    const loginResponse = await login(page, USER_EMAIL);
    const loginBody = await loginResponse.json();
    expect(loginBody.data.user.force_verification_required).toBe(false);

    const discoveryResponse = page.waitForResponse(
      res => res.url().includes('/api/v1/profiles/discovery') && res.request().method() === 'GET',
    );

    await page.goto('/dashboard/search');
    expect((await discoveryResponse).status()).toBe(200);

    await expect(page.getByTestId('verification-gate-banner')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Apply' })).toBeEnabled();
    await expect(page.getByTestId('profile-card').first()).toBeVisible();
  });
});
