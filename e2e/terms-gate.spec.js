import { test, expect } from '@playwright/test';

const sessionToken = 'e2e-terms-gate-token';

const viewer = {
  id: 91,
  email: 'terms@example.com',
  first_name: 'Terms',
  last_name: 'Member',
  role: 'user',
  user_state: 'active',
  terms_accepted: false,
  termsaccepted: false,
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

async function mockShell(page) {
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

  await page.route('**/api/v1/payments/transactions**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { transactions: [] },
      }),
    });
  });
}

test('terms gate accepts through the profile mutation and dismisses the dialog', async ({
  page,
}) => {
  let patchPayload = null;

  await seedSession(page);
  await mockShell(page);

  await page.route('**/api/v1/profiles/me', async route => {
    if (route.request().method() === 'PATCH') {
      patchPayload = route.request().postDataJSON();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { profile: { ...viewer, terms_accepted: true, termsaccepted: true } },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { profile: viewer } }),
    });
  });

  await page.goto('/settings');

  const dialog = page.getByRole('dialog');
  await expect(page.getByRole('heading', { name: 'Welcome to MarryLocal' })).toBeVisible();

  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'I AGREE' }).click();

  await expect.poll(() => patchPayload).toEqual({ terms_accepted: true });
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/dashboard\/search$/);
});

test('terms gate shows the fee locked in at registration', async ({ page }) => {
  const feeViewer = {
    ...viewer,
    accepted_one_time_fees_amount: 750,
  };

  await page.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem('marrylocal.auth.token', token);
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { token: sessionToken, user: feeViewer },
  );
  await mockShell(page);

  await page.route('**/api/v1/profiles/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { profile: feeViewer } }),
    });
  });

  await page.goto('/settings');

  await expect(page.getByRole('heading', { name: 'Welcome to MarryLocal' })).toBeVisible();
  await expect(page.getByText(/₹750 INR/).first()).toBeVisible();
  await expect(page.getByText(/250 members/)).toBeVisible();
});

test('administrators bypass the terms gate', async ({ page }) => {
  const adminViewer = {
    ...viewer,
    role: 'admin',
    is_admin: true,
  };

  await page.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem('marrylocal.auth.token', token);
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { token: sessionToken, user: adminViewer },
  );
  await mockShell(page);

  await page.route('**/api/v1/profiles/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { profile: adminViewer } }),
    });
  });

  await page.goto('/admin');

  await expect(page.getByRole('heading', { name: 'Welcome to MarryLocal' })).toHaveCount(0);
});

test('terms gate disagreement tears down the session and returns home', async ({ page }) => {
  await mockShell(page);

  await page.route('**/api/v1/profiles/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { profile: viewer } }),
    });
  });

  await page.route('**/api/v1/auth/logout', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success' }),
    });
  });

  await page.goto('/');
  await page.evaluate(
    ({ token, user }) => {
      window.localStorage.setItem('marrylocal.auth.token', token);
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { token: sessionToken, user: viewer },
  );

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Welcome to MarryLocal' })).toBeVisible();

  await page.getByRole('button', { name: 'I DO NOT AGREE' }).click();

  await page.waitForURL('**/');
  const storedToken = await page.evaluate(() =>
    window.localStorage.getItem('marrylocal.auth.token'),
  );
  expect(storedToken).toBeNull();
});
