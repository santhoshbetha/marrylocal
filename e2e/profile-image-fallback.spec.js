import { test, expect } from '@playwright/test';

const sessionToken = 'e2e-profile-image-token';

function viewer(overrides = {}) {
  return {
    id: 99,
    email: 'image@example.com',
    first_name: 'Image',
    last_name: 'Tester',
    user_handle: 'image_tester',
    shortid: 'image99',
    role: 'user',
    user_state: 'active',
    terms_accepted: true,
    gender: 'Female',
    bio: '',
    images: [],
    avatar_url: null,
    ...overrides,
  };
}

async function seedSession(page, user) {
  await page.addInitScript(
    ({ token, profile }) => {
      window.localStorage.setItem('marrylocal.auth.token', token);
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(profile));
    },
    { token: sessionToken, profile: user },
  );
}

async function mockProfile(page, user) {
  await page.route('**/api/v1/profiles/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { profile: { ...user, max_search_distance: 100 } },
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
}

test('gallery image wins on the large card while the thumbnail shows the avatar', async ({
  page,
}) => {
  const user = viewer({
    images: ['http://127.0.0.1:5173/LocalCouple.png'],
    avatar_url: 'http://127.0.0.1:5173/LogoYellow32.png',
  });

  await seedSession(page, user);
  await mockProfile(page, user);

  await page.goto('/profile');

  await expect(page.locator('img[alt="Profile picture"]')).toHaveAttribute('src', user.images[0]);
  await expect(page.locator('img[alt="Avatar"]')).toHaveAttribute('src', user.avatar_url);

  await page.getByTestId('primary-photo-card').click();
  await expect(page).toHaveURL(/\/photos$/);
});

test('missing gallery and avatar render initials and the hover upload cue', async ({ page }) => {
  const user = viewer({ images: [], avatar_url: null });

  await seedSession(page, user);
  await mockProfile(page, user);

  await page.goto('/profile');

  await expect(page.locator('img[alt="Profile picture"]')).toHaveCount(0);
  await expect(page.getByTestId('profile-initials')).toHaveText('IT');

  await page.getByTestId('primary-photo-card').hover();
  await expect(page.getByTestId('primary-photo-upload-cue')).toHaveCSS('opacity', '1');

  await page.getByTestId('primary-photo-card').click();
  await expect(page).toHaveURL(/\/photos$/);
});
