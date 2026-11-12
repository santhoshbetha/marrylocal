import { test, expect } from '@playwright/test';

const admin = {
  id: 1,
  email: 'admin@marrylocal.test',
  first_name: 'Ada',
  last_name: 'Admin',
  user_handle: 'ada_admin',
  shortid: 'admin01',
  role: 'admin',
  user_state: 'active',
  terms_accepted: true,
  email_verified: true,
  onboarding_complete: true,
  images: [],
  avatar_url: null,
};

const baseUsers = [
  {
    id: 101,
    email: 'neha@example.com',
    first_name: 'Neha',
    last_name: 'Verma',
    user_handle: 'neha101',
    shortid: 'neha101',
    phone_number: '+919800000001',
    city: 'Bangalore',
    state: 'Karnataka',
    age: 29,
    gender: 'Female',
    role: 'user',
    user_state: 'active',
    email_verified: true,
    aadhaar_verified: false,
    passport_verified: false,
    license_verified: false,
    terms_accepted: true,
    one_time_fees_paid: false,
    one_time_fees_required: true,
    accepted_one_time_fees_amount: 500,
    max_search_distance: 100,
    is_beta_tester: false,
    education_level: 'Bachelors level',
    economic_status: 'Middleclass',
    job_status: true,
    latitude: 12.9716,
    longitude: 77.5946,
    inserted_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
  {
    id: 102,
    email: 'arjun@example.com',
    first_name: 'Arjun',
    last_name: 'Rao',
    user_handle: 'arjun102',
    shortid: 'arjun102',
    phone_number: '+919800000002',
    city: 'Mysore',
    state: 'Karnataka',
    age: 32,
    gender: 'Male',
    role: 'user',
    user_state: 'active',
    email_verified: false,
    aadhaar_verified: true,
    passport_verified: false,
    license_verified: false,
    terms_accepted: true,
    one_time_fees_paid: true,
    one_time_fees_required: false,
    accepted_one_time_fees_amount: 0,
    max_search_distance: 75,
    is_beta_tester: false,
    education_level: 'Masters level',
    economic_status: 'Above Middleclass',
    job_status: true,
    latitude: 12.2958,
    longitude: 76.6394,
    inserted_at: '2026-01-03T00:00:00Z',
    updated_at: '2026-01-04T00:00:00Z',
  },
];

async function installAdminMocks(page) {
  const state = {
    users: baseUsers.map(user => ({ ...user })),
    patchedBody: null,
    bulkBody: null,
    emailBody: null,
    lastListParams: null,
  };

  await page.addInitScript(
    ({ user }) => {
      window.localStorage.setItem('marrylocal.auth.token', 'e2e-admin-token');
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { user: admin },
  );

  await page.route('**/api/v1/profiles/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { profile: admin } }),
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

  await page.route('**/api/v1/payments/transactions**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { transactions: [] } }),
    });
  });

  await page.route('**/api/v1/admin/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path.endsWith('/users/lookup')) {
      const raw = (url.searchParams.get('query') || '').trim().replace(/^@/, '').toLowerCase();
      const found = state.users.find(user =>
        [user.email, user.phone_number, user.user_handle, user.shortid, String(user.id)]
          .filter(Boolean)
          .some(value => String(value).toLowerCase() === raw),
      );

      if (!found) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'error', error: 'User not found' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { user: found } }),
      });
      return;
    }

    if (path.endsWith('/users/bulk-update') && method === 'POST') {
      state.bulkBody = request.postDataJSON();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          updated_count: state.bulkBody.user_ids.length,
        }),
      });
      return;
    }

    if (/\/users\/\d+$/.test(path) && method === 'PATCH') {
      state.patchedBody = request.postDataJSON();
      const id = Number(path.split('/').pop());
      const index = state.users.findIndex(user => user.id === id);

      if (index >= 0) {
        state.users[index] = { ...state.users[index], ...state.patchedBody };
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { user: index >= 0 ? state.users[index] : null },
        }),
      });
      return;
    }

    if (path.endsWith('/emails/preview-count') && method === 'GET') {
      const params = url.searchParams;
      const mode = params.get('mode');
      const count =
        mode === 'location'
          ? params.get('state') === 'Karnataka' && params.get('city') === 'Bangalore'
            ? 1
            : 0
          : (params.get('emails') || '')
              .split(';')
              .map(value => value.trim())
              .filter(Boolean).length;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', recipient_count: count }),
      });
      return;
    }

    if (path.endsWith('/emails/bulk-send') && method === 'POST') {
      state.emailBody = request.postDataJSON();

      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'queued',
          queued_count: state.emailBody.mode === 'location' ? 1 : state.emailBody.emails.length,
        }),
      });
      return;
    }

    if (path.endsWith('/users')) {
      const params = Object.fromEntries(url.searchParams.entries());
      state.lastListParams = params;

      const query = params.query?.trim();
      const terms = query
        ? query
            .split(';')
            .map(term => term.trim().toLowerCase())
            .filter(Boolean)
        : [];

      let result = state.users;

      if (terms.length > 0) {
        result = result.filter(user =>
          terms.some(term =>
            [
              user.first_name,
              user.last_name,
              user.email,
              user.phone_number,
              user.user_handle,
              user.shortid,
              String(user.id),
            ].some(value =>
              String(value ?? '')
                .toLowerCase()
                .includes(term),
            ),
          ),
        );
      }

      if (params.state && params.state !== 'All') {
        result = result.filter(user => user.state === params.state);
      }

      if (params.city && params.city !== 'All' && params.city !== 'All Cities') {
        result = result.filter(user => user.city === params.city);
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { users: result, count: result.length },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: {} }),
    });
  });

  return state;
}

test('admin user management looks up a user and toggles beta access', async ({ page }) => {
  const state = await installAdminMocks(page);

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();

  await page.getByPlaceholder(/Email, phone, @handle/i).fill('neha@example.com');
  await page.getByRole('button', { name: 'Search', exact: true }).click();

  await expect(page.getByText('Neha Verma')).toBeVisible();

  await page.locator('#is_beta_tester').click();
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect.poll(() => state.patchedBody).not.toBeNull();
  expect(state.patchedBody.is_beta_tester).toBe(true);
  expect(state.patchedBody.aadhaar_verified).toBe(false);
  expect(state.patchedBody.one_time_fees_required).toBe(true);
  await expect(page.getByText('User updated successfully')).toBeVisible();
});

test('bulk operations send one atomic batch update', async ({ page }) => {
  const state = await installAdminMocks(page);

  await page.goto('/admin/bulk');
  await expect(page.getByRole('heading', { name: 'Bulk User Operations' })).toBeVisible();

  await page.getByPlaceholder(/Name, email, phone/i).fill('neha;arjun');
  await page.getByRole('button', { name: 'Search', exact: true }).click();

  await expect(page.getByText('Neha Verma')).toBeVisible();
  await expect(page.getByText('Arjun Rao')).toBeVisible();

  await page.locator('[id^="user-"]').nth(0).click();
  await page.locator('[id^="user-"]').nth(1).click();
  await page.locator('#apply-email_verified').click();
  await page.locator('#email_verified').click();

  await page.getByRole('button', { name: /Update 2 selected users/i }).click();

  await expect.poll(() => state.bulkBody).not.toBeNull();
  expect(state.bulkBody.user_ids).toHaveLength(2);
  expect(state.bulkBody.updates).toEqual({ email_verified: true });
});

test('location user list filters by state and city and exports CSV', async ({ page }) => {
  const state = await installAdminMocks(page);

  await page.goto('/admin/userlist');
  await expect(page.getByRole('heading', { name: 'User List by Location' })).toBeVisible();

  await page.locator('#state-select').click();
  await page.getByRole('option', { name: 'Karnataka' }).click();
  await page.locator('#city-select').click();
  await page.getByRole('option', { name: 'Bangalore' }).click();
  await page.getByRole('button', { name: 'Search users' }).click();

  await expect(page.getByText('Neha Verma')).toBeVisible();
  expect(state.lastListParams).toMatchObject({ state: 'Karnataka', city: 'Bangalore' });

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export to CSV/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('users_Bangalore_Karnataka');
});

test('profile viewer renders verification and payment flags without date of birth', async ({
  page,
}) => {
  await installAdminMocks(page);

  await page.goto('/admin/profiles');
  await page.getByPlaceholder(/Name, email, phone/i).fill('neha@example.com');
  await page.getByRole('button', { name: 'Search', exact: true }).click();

  await page.getByRole('button', { name: /Neha Verma/ }).click();

  await expect(page.getByText("Neha Verma's profile")).toBeVisible();
  await expect(page.getByText('Verified', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Not paid')).toBeVisible();
  await expect(page.getByText('₹500')).toBeVisible();
  await expect(page.getByText('Date of Birth')).toHaveCount(0);
});

test('bulk email queues manual recipients and loads location recipients', async ({ page }) => {
  const state = await installAdminMocks(page);

  await page.goto('/admin/emails');
  await expect(page.getByRole('heading', { name: /Email Templates/i })).toBeVisible();

  await page.locator('#email-subject').fill('Hello from MarryLocal');
  await page.locator('#email-content').fill('<p>We have news for you.</p>');
  await page.locator('#manual-emails').fill('neha@example.com; arjun@example.com');

  await page.getByRole('button', { name: /Send to 2 recipients/i }).click();

  await expect.poll(() => state.emailBody).not.toBeNull();
  expect(state.emailBody).toMatchObject({
    emails: ['neha@example.com', 'arjun@example.com'],
    subject: 'Hello from MarryLocal',
    content: '<p>We have news for you.</p>',
  });

  await page.getByRole('tab', { name: 'Location Based' }).click();
  await page.locator('#state-select').click();
  await page.getByRole('option', { name: 'Karnataka', exact: true }).click();
  await page.locator('#city-select').click();
  await page.getByRole('option', { name: 'Bangalore', exact: true }).click();

  await page.getByRole('button', { name: 'Get Recipients Count' }).click();
  await expect(page.getByTestId('email-location-count')).toHaveText('1 recipient matched');

  await page.getByRole('button', { name: /Send to 1 recipient/i }).click();
  await expect.poll(() => state.emailBody).not.toBeNull();
  expect(state.emailBody).toMatchObject({
    mode: 'location',
    state: 'Karnataka',
    city: 'Bangalore',
  });
});
