import { test, expect } from '@playwright/test';

const sessionToken = 'e2e-photo-upload-token';

// A real 8x8 PNG generated with System.Drawing. React Easy Crop needs a
// decodable image before it emits `onCropComplete`.
const avatarPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAWSURBVChTY1CoyPuPDzOgC6Dj4aEAAFeGgUEU0rJwAAAAAElFTkSuQmCC',
  'base64',
);

const viewer = {
  id: 81,
  email: 'photos@example.com',
  first_name: 'Photo',
  last_name: 'Tester',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
  avatar_url: null,
  images: [],
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
}

test('direct file selection defaults to the first empty slot', async ({ page }) => {
  let uploadRequest = null;

  await seedSession(page);
  await mockShell(page);

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

  await page.route('**/api/v1/profiles/me/avatar', async route => {
    uploadRequest = route.request();

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          slot_index: 0,
          image_url: 'https://cdn.marrylocal.test/slot-0.jpg',
          profile: { ...viewer },
        },
      }),
    });
  });

  await page.goto('/photos');

  await expect(page.getByRole('heading', { name: 'Your photo gallery' })).toBeVisible();

  await page.setInputFiles('[data-testid="photo-file-input"]', {
    name: 'portrait.png',
    mimeType: 'image/png',
    buffer: avatarPng,
  });

  // The crop dialog must mount immediately after the file selection.
  await expect(page.getByRole('heading', { name: 'Crop photo for slot 1' })).toBeVisible();

  const applyButton = page.getByRole('button', { name: 'Apply' });
  await expect(applyButton).toBeEnabled();

  await applyButton.click();

  await expect(page.getByText('Photo uploaded to slot 1.')).toBeVisible();

  expect(uploadRequest).not.toBeNull();
  expect(uploadRequest.method()).toBe('POST');
  expect(uploadRequest.headers()['content-type']).toContain('multipart/form-data');

  const body = uploadRequest.postDataBuffer();
  const text = body.toString('latin1');

  expect(text).toContain('name="avatar"');
  expect(text).toContain('filename="photo-');
  expect(text).toMatch(/name="slot_index"\r\n\r\n0\r\n/);
});

test('clicking an empty slot uploads into that exact index', async ({ page }) => {
  let uploadRequest = null;
  let uploaded = false;
  const slotUrl = 'https://cdn.marrylocal.test/slot-3.jpg';

  await seedSession(page);
  await mockShell(page);

  await page.route('**/api/v1/profiles/me', async route => {
    const images = uploaded ? [null, null, null, slotUrl] : [];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { profile: { ...viewer, images, max_search_distance: 100 } },
      }),
    });
  });

  await page.route('**/api/v1/profiles/me/avatar', async route => {
    uploadRequest = route.request();
    uploaded = true;

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          slot_index: 3,
          image_url: slotUrl,
          profile: { ...viewer, images: [null, null, null, slotUrl] },
        },
      }),
    });
  });

  await page.goto('/photos');
  await expect(page.getByRole('heading', { name: 'Your photo gallery' })).toBeVisible();

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('photo-slot-3').click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles({
    name: 'slot-photo.png',
    mimeType: 'image/png',
    buffer: avatarPng,
  });

  await expect(page.getByRole('heading', { name: 'Crop photo for slot 4' })).toBeVisible();
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByText('Photo uploaded to slot 4.')).toBeVisible();

  const body = uploadRequest.postDataBuffer();
  const text = body.toString('latin1');

  expect(text).toMatch(/name="slot_index"\r\n\r\n3\r\n/);

  // The uploaded image appears at index 3, and the other slots stay empty.
  await expect(page.getByAltText('Gallery photo 4')).toBeVisible();
  await expect(page.getByTestId('photo-slot-0')).toBeVisible();
});
