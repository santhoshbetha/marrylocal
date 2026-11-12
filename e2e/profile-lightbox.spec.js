import { test, expect } from '@playwright/test';

const sessionToken = 'e2e-lightbox-token';

const viewer = {
  id: 81,
  email: 'viewer@example.com',
  first_name: 'Viewer',
  last_name: 'Account',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
};

const profile = {
  id: 801,
  shortid: 'lightbox1',
  user_handle: 'lightbox_member',
  first_name: 'Light',
  last_name: 'Box',
  age: 28,
  gender: 'Female',
  city: 'Bangalore',
  state: 'Karnataka',
  bio: 'A profile used to verify the photo lightbox.',
  images: ['/LogoYellow32.png', '/logored.png'],
  avatar_url: null,
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

test('profile photo opens a full-screen carousel lightbox and closes cleanly', async ({ page }) => {
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

  await page.route('**/api/v1/profiles/lightbox1', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { profile } }),
    });
  });

  await page.goto('/user/lightbox1');

  await page.getByRole('button', { name: 'Open full-screen photo viewer' }).click();

  const dialog = page.getByRole('dialog', { name: 'Full-screen profile photo viewer' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('1 / 2')).toBeVisible();

  await dialog.getByRole('button', { name: 'Next photo' }).click();
  await expect(dialog.getByText('2 / 2')).toBeVisible();

  await dialog.getByRole('button', { name: 'Close photo viewer' }).click();
  await expect(dialog).toHaveCount(0);

  await page.goto('/user/lightbox1?newTab=true');
  await expect(page.getByText('@lightbox_member')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back' })).toHaveCount(0);
  await expect(page.getByTitle('Open profile in new tab')).toHaveCount(0);
});
