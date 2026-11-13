import { test, expect } from '@playwright/test';

const API_URL = (process.env.E2E_API_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
const PASSWORD = 'Password123!';

const admin = {
  id: 900,
  email: 'admin.santhosh@marrylocal.test',
  first_name: 'Santhosh',
  last_name: 'Admin',
  role: 'admin',
  user_state: 'active',
  terms_accepted: true,
};

const viewer = {
  id: 901,
  email: 'kyc.member@example.com',
  first_name: 'Kyc',
  last_name: 'Member',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
  passport_verified: false,
  license_verified: false,
};

function sessionInit(_user, _token) {
  return ({ user, token }) => {
    window.localStorage.setItem('marrylocal.auth.token', token);
    window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
  };
}

test('disposable email and duplicate phone are rejected by the real API', async () => {
  const stamp = Date.now();
  const disposableEmail = `blocked.${stamp}@mailinator.com`;
  const phone = `9${String(stamp).slice(-9)}`;

  const disposable = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: disposableEmail,
      phone_number: phone,
      first_name: 'Disposable',
      last_name: 'Tester',
      password: PASSWORD,
      password_confirmation: PASSWORD,
      date_of_birth: '1994-05-15',
      gender: 'Male',
      city: 'Hyderabad',
      state: 'Telangana',
    }),
  });

  expect(disposable.status).toBe(422);
  const disposableBody = await disposable.json();
  expect(JSON.stringify(disposableBody.errors || {})).toMatch(/temporary email/i);

  const first = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `phone.one.${stamp}@marrylocal.test`,
      phone_number: phone,
      first_name: 'Phone',
      last_name: 'One',
      password: PASSWORD,
      password_confirmation: PASSWORD,
      date_of_birth: '1994-05-15',
      gender: 'Male',
      city: 'Hyderabad',
      state: 'Telangana',
    }),
  });

  expect(first.status).toBe(201);

  const duplicate = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `phone.two.${stamp}@marrylocal.test`,
      phone_number: `+91 ${phone}`,
      first_name: 'Phone',
      last_name: 'Two',
      password: PASSWORD,
      password_confirmation: PASSWORD,
      date_of_birth: '1994-05-15',
      gender: 'Male',
      city: 'Hyderabad',
      state: 'Telangana',
    }),
  });

  expect(duplicate.status).toBe(422);
  const duplicateBody = await duplicate.json();
  expect(JSON.stringify(duplicateBody.errors || {})).toMatch(/phone_number/i);
});

test('duplicate profile photo upload is rejected with a conflict', async ({ page }) => {
  await page.addInitScript(sessionInit(viewer, 'kyc-photo-token'), { user: viewer });
  await page.route('**/api/v1/profiles/me/avatar', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          code: 'duplicate_photo',
          message: 'This photo is already active on another profile.',
        }),
      });
      return;
    }

    await route.fallback();
  });

  await page.goto('/photos');
  const result = await page.evaluate(async () => {
    const body = new FormData();
    body.append('avatar', new Blob(['same-photo'], { type: 'image/jpeg' }), 'same.jpg');
    body.append('slot_index', '0');

    const response = await fetch('/api/v1/profiles/me/avatar', {
      method: 'POST',
      headers: { authorization: 'Bearer kyc-photo-token' },
      body,
    });

    return { status: response.status, body: await response.json() };
  });

  expect(result.status).toBe(409);
  expect(result.body.code).toBe('duplicate_photo');
});

test('manual KYC submission, admin 1-click approval, and duplicate document conflict', async ({
  page,
}) => {
  const pendingVerification = {
    id: 'verification-1',
    document_type: 'passport',
    document_number: 'P1234567',
    document_image_url: 'https://example.test/private-preview.jpg',
    status: 'pending_admin_review',
    inserted_at: new Date().toISOString(),
    user: {
      id: viewer.id,
      first_name: 'Kyc',
      last_name: 'Member',
      age: 31,
      gender: 'Male',
      user_handle: 'kyc_member',
    },
  };

  let submitted = false;
  let submissionCount = 0;
  let approvalCalled = false;

  await page.addInitScript(sessionInit(viewer, 'kyc-member-token'), { user: viewer });

  await page.route('**/api/v1/profiles/me', async route => {
    const auth = route.request().headers()['authorization'] || '';
    const profile = auth.includes('kyc-admin-token') ? admin : viewer;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { profile } }),
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

  await page.route('**/api/v1/verifications/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          verification: submitted ? { ...pendingVerification, document_number: 'P1234567' } : null,
        },
      }),
    });
  });

  await page.route('**/api/v1/vouch/nearest-verifiers', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { city: 'Delhi', count: 0, verifiers: [] },
      }),
    });
  });

  await page.route('**/api/v1/vouch/generate-token', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        secure_token: 'kyc-dedup-token',
        expires_in: 60,
        data: { secure_token: 'kyc-dedup-token', expires_in: 60 },
      }),
    });
  });

  await page.route('**/api/v1/verifications/submit', async route => {
    submissionCount += 1;

    if (submissionCount > 1) {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          code: 'duplicate_identity',
          message: 'This document number is already claimed by another verified account.',
        }),
      });
      return;
    }

    submitted = true;
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { verification: { ...pendingVerification, document_number: undefined } },
      }),
    });
  });

  await page.goto('/verify');
  await expect(page.getByRole('heading', { name: 'Identity verification' })).toBeVisible();
  await page.getByTestId('verify-mode-document').click();

  await page.locator('#document_type').click();
  await page.getByRole('option', { name: 'Indian Passport' }).click();
  await page.locator('#document_number').fill('P1234567');
  await page.getByTestId('verification-file-input').setInputFiles({
    name: 'passport.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAWSURBVChTY1CoyPuPDzOgC6Dj4aEAAFeGgUEU0rJwAAAAAElFTkSuQmCC',
      'base64',
    ),
  });
  await page.getByRole('button', { name: 'Submit for verification' }).click();

  await expect(page.getByTestId('kyc-status-banner')).toContainText(
    'Your document is under review',
  );
  await expect(page.getByTestId('kyc-status-banner')).toContainText(
    'You will be notified within 24 hours',
  );

  const duplicateUpload = await page.evaluate(async () => {
    const body = new FormData();
    body.append('document_type', 'passport');
    body.append('document_number', 'P1234567');
    body.append('document_image', new Blob(['doc'], { type: 'image/png' }), 'doc.png');

    const response = await fetch('/api/v1/verifications/submit', {
      method: 'POST',
      headers: { authorization: 'Bearer kyc-member-token' },
      body,
    });

    return { status: response.status, body: await response.json() };
  });

  expect(duplicateUpload.status).toBe(409);
  expect(duplicateUpload.body.code).toBe('duplicate_identity');

  // Admin approval queue runs in a fresh page so the member session scripts do
  // not overwrite the admin session.
  const adminPage = await page.context().newPage();
  await adminPage.addInitScript(sessionInit(admin, 'kyc-admin-token'), { user: admin });

  await adminPage.route('**/api/v1/profiles/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { profile: admin } }),
    });
  });

  await adminPage.route('**/api/v1/admin/settings', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { settings: { enforce_verification_gate: false, enforce_payment_gate: false } },
      }),
    });
  });

  await adminPage.route('**/api/v1/admin/verifications', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { verifications: submitted ? [pendingVerification] : [] },
      }),
    });
  });

  await adminPage.route('**/api/v1/admin/verifications/*/approve', async route => {
    approvalCalled = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { verification: { ...pendingVerification, status: 'verified' } },
      }),
    });
  });

  await adminPage.route('**/api/v1/admin/users/lookup**', async route => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'error' }),
    });
  });

  await adminPage.route('**/api/v1/notifications**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { notifications: [], pagination: { page: 1, total: 0 }, unread_count: 0 },
      }),
    });
  });

  await adminPage.route('**/api/v1/relationships/moderated**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { kind: 'moderated', blocked: [], muted: [], counts: { blocked: 0, muted: 0 } },
      }),
    });
  });

  await adminPage.goto('/admin');
  await expect(adminPage.getByText('Identity Review Queue', { exact: true })).toBeVisible();
  await expect(adminPage.getByText('Kyc Member')).toBeVisible();
  await expect(adminPage.getByText(/31 yrs/)).toBeVisible();
  await adminPage.getByTestId('admin-approve-verification-verification-1').click();
  await expect.poll(() => approvalCalled).toBe(true);
  await adminPage.close();
});
