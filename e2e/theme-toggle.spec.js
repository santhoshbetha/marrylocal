import { test, expect } from '@playwright/test';

const viewer = {
  id: 97,
  email: 'theme@example.com',
  first_name: 'Theme',
  last_name: 'Tester',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
  avatar_url: null,
  images: [],
};

async function mockSettingsShell(page) {
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

async function seedSession(page) {
  await page.addInitScript(
    ({ user }) => {
      window.localStorage.setItem('marrylocal.auth.token', 'e2e-theme-variant-token');
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { user: viewer },
  );
}

const backgroundVar = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--background').trim();

test('defaults to dark Warm Gold / Amber with the Sun control visible', async ({ page }) => {
  await page.goto('/');

  const html = page.locator('html');

  await expect(html).toHaveClass(/dark/);
  await expect(html).toHaveClass(/theme-dark-amber/);
  await expect(html).not.toHaveClass(/theme-dark-teal|theme-light-green/);

  await expect.poll(() => page.evaluate(() => localStorage.getItem('theme-mode'))).toBe('dark');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('dark-variant'))).toBe('amber');
  await expect.poll(() => page.evaluate(backgroundVar)).toBe('hsl(24 10% 8%)');

  await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
  await expect(page.locator('img[src="/LogoYellow32.png"]').first()).toBeVisible();
  await expect(page.locator('img[src="/LogoTeal32.png"]').first()).toBeHidden();
  await expect(page.locator('footer img[src="/LogoYellow32.png"]')).toBeVisible();
  await expect(page.locator('footer img[src="/LogoTeal32.png"]')).toBeHidden();
});

test('Sun/Moon toggle switches light mode and persists it', async ({ page }) => {
  await page.goto('/');

  const html = page.locator('html');

  await page.getByRole('button', { name: 'Switch to light mode' }).click();

  await expect(html).not.toHaveClass(/dark/);
  await expect(html).toHaveClass(/theme-light-green/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('theme-mode'))).toBe('light');
  await expect.poll(() => page.evaluate(backgroundVar)).toBe('hsl(160 20% 98%)');
  await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
  await expect(page.locator('img[src="/LogoTeal32.png"]').first()).toBeVisible();
  await expect(page.locator('img[src="/LogoYellow32.png"]').first()).toBeHidden();
  await expect(page.locator('footer img[src="/LogoTeal32.png"]')).toBeVisible();
  await expect(page.locator('footer img[src="/LogoYellow32.png"]')).toBeHidden();

  await page.reload();

  await expect(page.locator('html')).toHaveClass(/theme-light-green/);
  await expect(page.locator('html')).not.toHaveClass(/dark/);

  await page.getByRole('button', { name: 'Switch to dark mode' }).click();

  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveClass(/theme-dark-amber/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('theme-mode'))).toBe('dark');
  await expect(page.locator('img[src="/LogoYellow32.png"]').first()).toBeVisible();
  await expect(page.locator('img[src="/LogoTeal32.png"]').first()).toBeHidden();
  await expect(page.locator('footer img[src="/LogoYellow32.png"]')).toBeVisible();
  await expect(page.locator('footer img[src="/LogoTeal32.png"]')).toBeHidden();
});

test('dark flavor selector applies teal instantly and preserves it across modes', async ({
  page,
}) => {
  await seedSession(page);
  await mockSettingsShell(page);

  await page.goto('/settings');

  const html = page.locator('html');
  await expect(html).toHaveClass(/theme-dark-amber/);

  await page.getByTestId('app-variant-trigger').click();
  await page.getByRole('option', { name: 'Classic Teal (Green Dark)' }).click();

  await expect(html).toHaveClass(/dark/);
  await expect(html).toHaveClass(/theme-dark-teal/);
  await expect(html).not.toHaveClass(/theme-dark-amber/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('dark-variant'))).toBe('teal');
  await expect.poll(() => page.evaluate(backgroundVar)).toBe('hsl(165 35% 8%)');
  await expect(page.getByText('Color scheme theme updated successfully!')).toBeVisible();

  // Light mode ignores the dark flavor but keeps it stored.
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(html).toHaveClass(/theme-light-green/);
  await expect(html).not.toHaveClass(/dark/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('dark-variant'))).toBe('teal');

  // Returning to dark restores the teal flavor.
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(html).toHaveClass(/dark/);
  await expect(html).toHaveClass(/theme-dark-teal/);

  await page.reload();
  await expect(page.locator('html')).toHaveClass(/theme-dark-teal/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('dark-variant'))).toBe('teal');
});

test('legacy Modern Blue preference migrates to the amber default', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('theme-mode', 'dark');
    window.localStorage.setItem('dark-variant', 'blue');
  });

  await page.goto('/');

  const html = page.locator('html');

  await expect(html).toHaveClass(/dark/);
  await expect(html).toHaveClass(/theme-dark-amber/);
  await expect(html).not.toHaveClass(/theme-dark-blue/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('dark-variant'))).toBe('amber');
  await expect.poll(() => page.evaluate(backgroundVar)).toBe('hsl(24 10% 8%)');
});
