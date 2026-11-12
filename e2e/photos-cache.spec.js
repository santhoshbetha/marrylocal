import { test, expect } from '@playwright/test';

const sessionToken = 'e2e-photos-cache-token';

function viewer(overrides = {}) {
  return {
    id: 100,
    email: 'photos-cache@example.com',
    first_name: 'Photo',
    last_name: 'Cache',
    user_handle: 'photo_cache',
    shortid: 'photo100',
    role: 'user',
    user_state: 'active',
    terms_accepted: true,
    gender: 'Female',
    bio: '',
    images: [],
    avatar_url: null,
    updated_at: '2026-11-11T12:00:00Z',
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

async function mockShell(page, user) {
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
}

test('gallery and banner images carry the profile timestamp cache-buster', async ({ page }) => {
  const galleryUrl = 'http://127.0.0.1:5173/LocalCouple.png';
  const avatarUrl = 'http://127.0.0.1:5173/LogoYellow32.png';
  const user = viewer({ images: [galleryUrl], avatar_url: avatarUrl });

  await seedSession(page, user);
  await mockShell(page, user);

  await page.goto('/photos');

  const bannerImage = page.getByTestId('primary-discovery-photo');
  await expect(bannerImage).toHaveAttribute('src', new RegExp(`LocalCouple\\.png\\?t=\\d+$`));

  // The banner must bind to images[0], never to the avatar asset.
  await expect(bannerImage).not.toHaveAttribute('src', /logo\.png/);

  const galleryImage = page.getByAltText('Gallery photo 1');
  await expect(galleryImage).toHaveAttribute('src', new RegExp(`LocalCouple\\.png\\?t=\\d+$`));
});

test('banner falls back to initials when images[0] is empty', async ({ page }) => {
  const user = viewer({
    images: [],
    avatar_url: 'http://127.0.0.1:5173/LogoYellow32.png',
  });

  await seedSession(page, user);
  await mockShell(page, user);

  await page.goto('/photos');

  await expect(page.getByTestId('primary-discovery-initials')).toBeVisible();
  await expect(page.getByTestId('primary-discovery-photo')).toHaveCount(0);
});
