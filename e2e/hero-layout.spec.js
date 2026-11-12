import { test, expect } from '@playwright/test';

test('hero community message sits below the image without overlapping it', async ({ page }) => {
  await page.goto('/');

  const image = page.getByAltText('Happy couple illustration');
  const message = page.getByText('Built for your local community', { exact: true });

  await expect(image).toBeVisible();
  await expect(message).toBeVisible();

  const particles = page.locator('.celebrate-node');
  await expect(particles).toHaveCount(20);

  const celebrationLayer = page
    .locator('div[aria-hidden="true"]')
    .filter({ has: particles })
    .first();
  await expect(celebrationLayer).toHaveCSS('pointer-events', 'none');

  const imageBox = await image.boundingBox();
  const messageBox = await message.boundingBox();

  expect(imageBox).not.toBeNull();
  expect(messageBox).not.toBeNull();

  // The message card must start at or below the bottom edge of the image.
  expect(messageBox.y).toBeGreaterThanOrEqual(imageBox.y + imageBox.height);
});
