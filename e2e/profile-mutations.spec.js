import { test, expect } from '@playwright/test';

const sessionToken = 'e2e-profile-mutations-token';
const account = {
  email: 'delhi.demo.neha@marrylocal.test',
  password: 'Password123!',
};

const baseProfile = {
  id: 88,
  email: account.email,
  first_name: 'Neha',
  last_name: 'Verma',
  user_handle: 'neha_demo',
  shortid: 'neha88',
  phone_number: '9876543210',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
  gender: 'Female',
  bio: 'Original profile bio.',
  education_level: 'Bachelors level',
  language: 'Kannada',
  religion: 'Hindu',
  community: 'Brahmin Smartha',
  caste: 'Smartha',
  job_status: false,
  core_details_edited: false,
  images: [],
  avatar_url: null,
  facebook: '',
  instagram: '',
  max_search_distance: 100,
};

const CORE_PROFILE_FIELDS = ['first_name', 'last_name', 'language', 'community'];

async function installMocks(page) {
  const state = {
    profile: { ...baseProfile },
    patchPayloads: [],
  };

  await page.route('**/api/v1/auth/login', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          token: sessionToken,
          token_type: 'Bearer',
          expires_in_days: 14,
          user: state.profile,
        },
      }),
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

  await page.route('**/api/v1/profiles/me', async route => {
    if (route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON();
      state.patchPayloads.push(payload);

      const blockedCoreEdit = CORE_PROFILE_FIELDS.some(
        field => field in payload && payload[field] !== state.profile[field],
      );

      if (state.profile.core_details_edited && blockedCoreEdit) {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'error',
            code: 'core_details_locked',
            message: 'Name, language, and community can only be updated once.',
          }),
        });
        return;
      }

      state.profile = {
        ...state.profile,
        ...payload,
        ...(blockedCoreEdit ? { core_details_edited: true } : {}),
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { profile: state.profile } }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { profile: state.profile } }),
    });
  });

  await page.route('**/api/v1/auth/check-handle**', async route => {
    const handle = new URL(route.request().url()).searchParams.get('handle');

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        handle === 'rahul'
          ? { available: false, message: 'This handle is already taken.' }
          : { available: true, message: 'Handle is available!' },
      ),
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

  return state;
}

async function login(page) {
  await page.goto('/login');
  await page.locator('#login-email').fill(account.email);
  await page.locator('#login-password').fill(account.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard\/search/);
}

test('Test 1: updates core matrimonial profile fields on /profile', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  const state = await installMocks(page);
  await login(page);

  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Your Profile' })).toBeVisible();

  // Contact/social editing must live in Settings, never on Profile.
  for (const field of ['user_handle', 'phone_number', 'instagram', 'facebook']) {
    await expect(page.locator(`input[name="${field}"]`)).toHaveCount(0);
  }
  await expect(page.getByRole('link', { name: /Edit in Settings/i })).toBeVisible();

  // The one-time notice is visible before the first correction.
  await expect(page.getByTestId('profile-core-notice')).toContainText('can only be changed ONCE');

  // Community and caste are a single dropdown now.
  await expect(page.locator('#caste')).toHaveCount(0);
  await expect(page.getByLabel('Community / Caste')).toHaveCount(1);

  await page.locator('#first_name').fill('Neha Updated');
  await page.locator('#last_name').fill('Verma Updated');
  await page.locator('#education_level').selectOption('Masters level');
  await page.locator('#language').selectOption('Kannada');
  await page.locator('#religion').selectOption('Hindu');

  await page.locator('#community').click();
  await page.getByRole('option', { name: 'Brahmin Iyer', exact: true }).click();

  if ((await page.locator('#job_status').getAttribute('aria-checked')) !== 'true') {
    await page.locator('#job_status').click();
  }

  // A core-field change is intercepted by the one-time confirmation dialog.
  await page.getByTestId('profile-core-save').click();
  await expect(page.getByTestId('profile-core-confirm-dialog')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Confirm One-Time Profile Changes' }),
  ).toBeVisible();
  expect(state.patchPayloads).toHaveLength(0);

  // Cancel leaves the profile untouched.
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByTestId('profile-core-confirm-dialog')).toBeHidden();
  expect(state.patchPayloads).toHaveLength(0);

  // Re-submitting and confirming sends the mutation.
  await page.getByTestId('profile-core-save').click();
  const [response] = await Promise.all([
    page.waitForResponse(
      res => res.url().includes('/api/v1/profiles/me') && res.request().method() === 'PATCH',
    ),
    page.getByTestId('profile-core-confirm-save').click(),
  ]);

  expect(response.status()).toBe(200);

  expect(state.patchPayloads.at(-1)).toEqual({
    first_name: 'Neha Updated',
    last_name: 'Verma Updated',
    education_level: 'Masters level',
    job_status: true,
    language: 'Kannada',
    religion: 'Hindu',
    community: 'Brahmin Iyer',
  });

  await expect(page.getByText('Profile updated successfully!').first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your Profile' })).toBeVisible();

  await expect(page.locator('#first_name')).toHaveValue('Neha Updated');
  await expect(page.locator('#last_name')).toHaveValue('Verma Updated');
  await expect(page.locator('#education_level')).toHaveValue('Masters level');
  await expect(page.locator('#language')).toHaveValue('Kannada');
  await expect(page.locator('#religion')).toHaveValue('Hindu');
  await expect(page.locator('#community')).toContainText('Brahmin Iyer');
  await expect(page.locator('#job_status')).toHaveAttribute('aria-checked', 'true');

  // After the one-time correction the sensitive fields are locked.
  await expect(page.getByTestId('profile-core-notice')).toContainText('are now locked');
  await expect(page.locator('#first_name')).toBeDisabled();
  await expect(page.locator('#last_name')).toBeDisabled();
  await expect(page.locator('#language')).toBeDisabled();
  await expect(page.locator('#community')).toBeDisabled();
  await expect(page.locator('#education_level')).toBeEnabled();
  await expect(page.locator('#religion')).toBeEnabled();
  expect(state.profile.core_details_edited).toBe(true);

  for (const field of ['user_handle', 'phone_number', 'instagram', 'facebook']) {
    await expect(page.locator(`input[name="${field}"]`)).toHaveCount(0);
  }

  expect(pageErrors).toEqual([]);
});

test('Test 2: handle, phone, and social updates in Settings sync back to /profile', async ({
  page,
}) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  const state = await installMocks(page);
  const uniqueHandle = `neha_test_${Date.now().toString().slice(-5)}`;

  await login(page);
  await page.goto('/profile');

  await page.getByRole('link', { name: /Edit in Settings/i }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByText('Profile details', { exact: true })).toBeVisible();

  const handleInput = page.getByTestId('handle-input');
  await expect(handleInput).toHaveValue('neha_demo');

  // Taken handle: wait for the debounced availability check.
  await Promise.all([
    page.waitForResponse(
      res => res.url().includes('/api/v1/auth/check-handle') && res.url().includes('handle=rahul'),
    ),
    handleInput.fill('rahul'),
  ]);

  await expect(page.getByText('❌ This handle is already taken.')).toBeVisible();
  await expect(page.getByTestId('handle-save')).toBeDisabled();

  // Available handle.
  await Promise.all([
    page.waitForResponse(
      res =>
        res.url().includes('/api/v1/auth/check-handle') &&
        res.url().includes(encodeURIComponent(uniqueHandle)),
    ),
    handleInput.fill(uniqueHandle),
  ]);

  await expect(page.getByText('✅ Handle is available!')).toBeVisible();
  await expect(page.getByTestId('handle-save')).toBeEnabled();

  await page.locator('#phone_number').fill('9876543210');
  await page.locator('#instagram').fill('https://instagram.com');
  await page.locator('#facebook').fill('https://facebook.com');

  const [response] = await Promise.all([
    page.waitForResponse(
      res => res.url().includes('/api/v1/profiles/me') && res.request().method() === 'PATCH',
    ),
    page.getByTestId('handle-save').click(),
  ]);

  expect(response.status()).toBe(200);

  expect(state.patchPayloads.at(-1)).toEqual({
    user_handle: uniqueHandle,
    phone_number: '9876543210',
    instagram: 'https://instagram.com',
    facebook: 'https://facebook.com',
  });

  await expect(page.getByText('Profile details updated successfully!').first()).toBeVisible();

  // Cross-page sync: the read-only summary must reflect the saved values.
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Your Profile' })).toBeVisible();
  await expect(page.getByText('Account & Contact Info')).toBeVisible();

  await expect(page.getByText(`@${uniqueHandle}`, { exact: true }).last()).toBeVisible();
  await expect(page.getByText('9876543210', { exact: true })).toBeVisible();

  const instagramLink = page.getByRole('link', { name: 'https://instagram.com' });
  await expect(instagramLink).toBeVisible();
  await expect(instagramLink).toHaveAttribute('href', 'https://instagram.com');

  const facebookLink = page.getByRole('link', { name: 'https://facebook.com' });
  await expect(facebookLink).toBeVisible();
  await expect(facebookLink).toHaveAttribute('href', 'https://facebook.com');

  for (const field of ['user_handle', 'phone_number', 'instagram', 'facebook']) {
    await expect(page.locator(`input[name="${field}"]`)).toHaveCount(0);
  }

  expect(pageErrors).toEqual([]);
});

test('Test 3: non-core updates save without the one-time confirmation', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  const state = await installMocks(page);
  await login(page);

  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Your Profile' })).toBeVisible();

  await page.locator('#education_level').selectOption('Plus 2 level');
  await page.locator('#religion').selectOption('Muslim');

  if ((await page.locator('#job_status').getAttribute('aria-checked')) !== 'true') {
    await page.locator('#job_status').click();
  }

  const [response] = await Promise.all([
    page.waitForResponse(
      res => res.url().includes('/api/v1/profiles/me') && res.request().method() === 'PATCH',
    ),
    page.getByTestId('profile-core-save').click(),
  ]);

  expect(response.status()).toBe(200);
  await expect(page.getByTestId('profile-core-confirm-dialog')).toBeHidden();

  expect(state.patchPayloads.at(-1)).toEqual({
    first_name: 'Neha',
    last_name: 'Verma',
    education_level: 'Plus 2 level',
    job_status: true,
    language: 'Kannada',
    religion: 'Muslim',
    community: 'Brahmin Smartha',
  });
  expect(state.profile.core_details_edited).toBe(false);

  expect(pageErrors).toEqual([]);
});
