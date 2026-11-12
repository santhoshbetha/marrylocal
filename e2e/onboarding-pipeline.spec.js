import { test, expect } from '@playwright/test';

function randomCredential() {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  return {
    firstName: 'Asha',
    lastName: 'Rao',
    email: `asha.${suffix}@example.com`,
    phone: `98${suffix.slice(-8)}`,
    password: `MarryLocal#${suffix.slice(-8)}`,
  };
}

const sessionToken = 'e2e-opaque-bearer-token';

const profile = {
  id: 101,
  userid: 101,
  shortid: 'asha101',
  user_handle: 'asha_rao',
  first_name: 'Asha',
  firstname: 'Asha',
  last_name: 'Rao',
  lastname: 'Rao',
  age: 29,
  gender: 'Female',
  city: 'Bengaluru',
  state: 'Karnataka',
  religion: 'Hindu',
  community: 'Brahmin',
  caste: 'Smartha',
  language: 'Kannada',
  education_level: 'Masters level',
  economic_status: 'Middleclass',
  job_status: true,
  bio: 'Product designer who loves filter coffee, Bharatanatyam, and long walks around Cubbon Park.',
  images: [],
  distance_km: 4.2,
  distance_meters: 4200,
  role: 'user',
  user_state: 'active',
  userstate: 'active',
  terms_accepted: true,
  termsaccepted: true,
};

const secondProfile = {
  ...profile,
  id: 202,
  userid: 202,
  shortid: 'vikram202',
  user_handle: 'vikram_s',
  first_name: 'Vikram',
  firstname: 'Vikram',
  last_name: 'Shetty',
  lastname: 'Shetty',
  age: 32,
  gender: 'Male',
  community: 'Vokkaliga',
  distance_km: 8.7,
  distance_meters: 8700,
};

async function installApiMocks(page, credentials) {
  await page.route('**/api/v1/locations/autocomplete**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          locations: [
            { name: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
          ],
        },
      }),
    });
  });

  await page.route('**/api/v1/auth/register', async route => {
    const body = route.request().postDataJSON();

    if (body.email !== credentials.email) {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'error', message: 'Unexpected registration payload' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          token: sessionToken,
          token_type: 'Bearer',
          user: { ...profile, email: credentials.email },
        },
      }),
    });
  });

  await page.route('**/api/v1/profiles/me', async route => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { profile } }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { profile: { ...profile, email: credentials.email } },
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
          profiles: [profile, secondProfile],
          pagination: {
            page: 1,
            per_page: 20,
            total: 2,
            total_pages: 1,
            has_next_page: false,
          },
          locale: { radius_km: 100, latitude: 12.9716, longitude: 77.5946 },
        },
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

  await page.route('**/api/v1/relationships**', async route => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { inserted: true, is_match: false, notifications: [], relationships: {} },
      }),
    });
  });

  await page.route('**/api/v1/auth/logout', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success' }),
    });
  });
}

test.describe('MarryLocal onboarding pipeline', () => {
  test('uploads an avatar through the authenticated multipart router', async ({ page }) => {
    const avatarToken = 'e2e-avatar-bearer-token';
    const uploadedAvatarUrl = 'http://127.0.0.1:5173/LogoYellow32.png';
    const pageErrors = [];
    let avatarUploaded = false;
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.addInitScript(
      ({ token, user }) => {
        window.localStorage.setItem('marrylocal.auth.token', token);
        window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
      },
      { token: avatarToken, user: { ...profile, email: 'avatar@example.com' } },
    );

    await page.route('**/api/v1/profiles/me', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success', data: { profile } }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            profile: {
              ...profile,
              avatar_url: avatarUploaded ? uploadedAvatarUrl : null,
              email: 'avatar@example.com',
            },
          },
        }),
      });
    });

    await page.route('**/api/v1/profiles/me/avatar', async route => {
      avatarUploaded = true;

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            avatar_url: uploadedAvatarUrl,
            profile: { ...profile, avatar_url: uploadedAvatarUrl },
          },
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

    await page.goto('/profile');
    await expect(page.getByTestId('avatar-upload-button')).toBeVisible();
    await expect(page.getByTestId('profile-initials')).toHaveText('AR');

    const uploadRequest = page.waitForRequest(
      request =>
        request.url().includes('/api/v1/profiles/me/avatar') && request.method() === 'POST',
    );

    await page.getByTestId('avatar-input').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAWSURBVChTY1CoyPuPDzOgC6Dj4aEAAFeGgUEU0rJwAAAAAElFTkSuQmCC',
        'base64',
      ),
    });

    // Selecting an avatar mounts the shared crop dialog; the multipart upload
    // only starts once the user applies the crop.
    await expect(page.getByRole('heading', { name: 'Crop your avatar' })).toBeVisible();

    await page.getByRole('dialog').getByRole('button', { name: 'Apply' }).click();

    const request = await uploadRequest;
    expect(request.headers().authorization).toBe(`Bearer ${avatarToken}`);

    await expect(page.locator('img[alt="Profile picture"]')).toHaveAttribute(
      'src',
      uploadedAvatarUrl,
    );
    await expect(page.locator('img[alt="Avatar"]')).toHaveAttribute('src', uploadedAvatarUrl);
    expect(pageErrors).toEqual([]);
  });

  test('revokes the bearer session, clears Zustand storage, and returns home', async ({ page }) => {
    const logoutToken = 'e2e-logout-bearer-token';
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.addInitScript(
      ({ token, user }) => {
        window.localStorage.setItem('marrylocal.auth.token', token);
        window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
      },
      { token: logoutToken, user: { ...profile, email: 'logout@example.com' } },
    );

    await page.route('**/api/v1/profiles/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { profile: { ...profile, email: 'logout@example.com' } },
        }),
      });
    });

    await page.route('**/api/v1/auth/logout', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success' }),
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

    const logoutRequest = page.waitForRequest(
      request => request.url().includes('/api/v1/auth/logout') && request.method() === 'DELETE',
    );

    await page.goto('/profile');
    await page.getByRole('button', { name: 'Toggle user menu' }).click();
    await page.getByRole('menuitem', { name: /log out/i }).click();

    const request = await logoutRequest;
    expect(request.headers().authorization).toBe(`Bearer ${logoutToken}`);

    await page.waitForURL('**/');
    const storedToken = await page.evaluate(() =>
      window.localStorage.getItem('marrylocal.auth.token'),
    );
    expect(storedToken).toBeNull();
    expect(pageErrors).toEqual([]);
  });

  test('persists privacy toggles through the settings mutation', async ({ page }) => {
    const settingsToken = 'e2e-settings-bearer-token';
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.addInitScript(
      ({ token, user }) => {
        window.localStorage.setItem('marrylocal.auth.token', token);
        window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
      },
      { token: settingsToken, user: { ...profile, email: 'settings@example.com' } },
    );

    await page.route('**/api/v1/profiles/me', async route => {
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON();

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              profile: {
                ...profile,
                ...body,
                show_phone: Boolean(body.show_phone),
                show_facebook: Boolean(profile.show_facebook),
                show_instagram: Boolean(profile.show_instagram),
                show_community: Boolean(profile.show_community),
                show_in_other_religion_people_search: Boolean(
                  profile.show_in_other_religion_people_search,
                ),
                location_change_locked: false,
                allow_location_change_at: null,
              },
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            profile: {
              ...profile,
              email: 'settings@example.com',
              show_phone: false,
              show_facebook: false,
              show_instagram: false,
              show_community: false,
              show_in_other_religion_people_search: false,
              location_change_locked: false,
              allow_location_change_at: null,
            },
          },
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

    await page.goto('/settings');
    await expect(page.getByTestId('settings-toggle-show_phone')).toBeVisible();

    const patchRequest = page.waitForRequest(
      request => request.url().includes('/api/v1/profiles/me') && request.method() === 'PATCH',
    );

    await page.getByTestId('settings-toggle-show_phone').click();

    const request = await patchRequest;
    expect(request.headers().authorization).toBe(`Bearer ${settingsToken}`);
    expect(request.postDataJSON()).toEqual({ show_phone: true });
    expect(pageErrors).toEqual([]);
  });

  test('validates signup, persists the bearer token, captures lifestyle alignment, and mounts discovery', async ({
    page,
  }) => {
    const credentials = randomCredential();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await installApiMocks(page, credentials);

    // Step 1: empty submit surfaces Yup inline errors.
    await page.goto('/signup');
    await page.getByTestId('signup-submit').click();

    await expect(page.getByTestId('error-first_name')).toHaveText('First name is required');
    await expect(page.getByTestId('error-last_name')).toHaveText('Last name is required');
    await expect(page.getByTestId('error-email')).toHaveText('Email is required');
    await expect(page.getByTestId('error-password')).toHaveText('Password is required');
    await expect(page.getByTestId('error-gender')).toHaveText('Gender is required');
    await expect(page.getByTestId('error-religion')).toHaveText('Religion is required');
    await expect(page.getByTestId('error-community')).toHaveText(
      'Please select your community/caste',
    );
    await expect(page.getByTestId('error-state')).toHaveText('Please select your state');
    await expect(page.getByTestId('error-city')).toHaveText('Please select your city');

    // The restored datasets are complete and untruncated.
    expect(await page.locator('#community option').count()).toBeGreaterThan(800);
    expect(await page.locator('#language option').count()).toBeGreaterThan(50);
    expect(await page.locator('#state option').count()).toBeGreaterThan(35);

    // Step 2: complete registration and prove the token is cached.
    await page.locator('#first_name').fill(credentials.firstName);
    await page.locator('#last_name').fill(credentials.lastName);
    await page.locator('#email').fill(credentials.email);
    await page.locator('#phone_number').fill(credentials.phone);
    await page.locator('#password').fill(credentials.password);
    await page.locator('#password_confirmation').fill(credentials.password);
    await page.locator('#gender').selectOption('Female');
    await page.locator('#date_of_birth').fill('1995-01-01');
    await page.locator('#religion').selectOption('Hindu');
    await page.locator('#community').selectOption('Brahmin Smartha');
    await page.locator('#caste').fill('Smartha');
    await page.locator('#language').selectOption('Kannada');

    // State drives the city option set and clears any stale dependent value.
    await expect(page.locator('#city')).toBeDisabled();

    await page.locator('#state').selectOption('Maharashtra');
    await expect(page.locator('#city')).toBeEnabled();
    await expect(page.locator('#city option[value="Mumbai"]')).toHaveCount(1);
    await page.locator('#city').selectOption('Mumbai');
    await expect(page.locator('#city')).toHaveValue('Mumbai');

    await page.locator('#state').selectOption('Karnataka');
    await expect(page.locator('#city')).toHaveValue('');
    await expect(page.locator('#city option[value="Mumbai"]')).toHaveCount(0);
    await expect(page.locator('#city option[value="Bengaluru"]')).toHaveCount(0);
    await expect(page.locator('#city option[value="Bangalore"]')).toHaveCount(1);
    await page.locator('#city').selectOption('Bangalore');
    await expect(page.locator('#state')).toHaveValue('Karnataka');

    const [registrationResponse] = await Promise.all([
      page.waitForResponse(
        response =>
          response.url().includes('/api/v1/auth/register') &&
          response.request().method() === 'POST',
      ),
      page.getByTestId('signup-submit').click(),
    ]);

    expect(registrationResponse.status()).toBe(200);
    await page.waitForURL('**/onboarding/lifestyle');

    const storedToken = await page.evaluate(() =>
      window.localStorage.getItem('marrylocal.auth.token'),
    );
    expect(storedToken).toBe(sessionToken);

    // Step 3: drag the lifestyle slider past 75% and verify qualitative copy.
    const slider = page.getByTestId('lifestyle-slider');
    await expect(slider).toBeVisible();

    const box = await slider.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.84, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();

    await expect(page.getByTestId('lifestyle-label')).toHaveText('Strongly lean right');
    await expect(page.getByTestId('lifestyle-label')).not.toHaveText(/[0-9]/);
    await expect(page.locator('[data-testid="lifestyle-score"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="lifestyle-value"]')).toHaveCount(0);

    // Step 4: complete and mount the infinite discovery dashboard.
    await Promise.all([
      page.waitForURL('**/dashboard'),
      page.getByTestId('onboarding-complete').click(),
    ]);

    await expect(page.getByTestId('discovery-feed')).toBeVisible();
    await expect(page.getByTestId('profile-card')).toHaveCount(2);
    await expect(page.getByTestId('like-button').first()).toBeVisible();
    await expect(page.getByTestId('shortlist-button').first()).toHaveClass(/text-foreground/);

    expect(pageErrors).toEqual([]);
  });
});
