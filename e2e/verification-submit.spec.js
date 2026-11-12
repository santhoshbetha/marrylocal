import { test, expect } from '@playwright/test';

const sessionToken = 'e2e-verification-submit-token';

const viewer = {
  id: 71,
  email: 'viewer@example.com',
  first_name: 'Viewer',
  last_name: 'Account',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
};

async function seedSession(page) {
  await page.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem('marrylocal.auth.token', token);
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { token: sessionToken, user: viewer },
  );
}

test('verification page submits a multipart document and shows the review banner', async ({
  page,
}) => {
  let uploadRequest = null;

  await seedSession(page);

  await page.route('**/api/v1/profiles/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { profile: { ...viewer, max_search_distance: 100 } },
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

  await page.route('**/api/v1/verifications/submit', async route => {
    uploadRequest = route.request();
    const contentType = route.request().headers()['content-type'] || '';

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          verification: {
            id: '8a1d5f40-0000-4000-8000-000000000001',
            document_type: 'aadhaar',
            status: 'pending_admin_review',
          },
        },
        contentType,
      }),
    });
  });

  await page.goto('/verify');

  await expect(page.getByRole('heading', { name: 'Identity verification' })).toBeVisible();

  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Aadhaar Card' }).click();
  await page.locator('#document_number').fill('123456789012');

  await page.setInputFiles('[data-testid="verification-file-input"]', {
    name: 'aadhaar.png',
    mimeType: 'image/png',
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  });

  await page.getByRole('button', { name: /Submit for verification/i }).click();

  await expect(
    page.getByText(
      'Verification document uploaded successfully. Your profile is currently under review.',
    ),
  ).toBeVisible();

  expect(uploadRequest).not.toBeNull();
  expect(uploadRequest.method()).toBe('POST');
  expect(uploadRequest.headers()['content-type']).toContain('multipart/form-data');
  expect(uploadRequest.postData() || '').toContain('aadhaar');
});
