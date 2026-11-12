import { test, expect } from '@playwright/test';

/**
 * Integration coverage for Discovery radius, staged Full City filtering,
 * full-city distances, server-sorted pagination, and rate limiting.
 *
 * Requires the Phoenix backend at E2E_API_URL and the deterministic seeds.
 */

const PASSWORD = 'Password123!';
const API_URL = (process.env.E2E_API_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
const NEHA_EMAIL = 'delhi.demo.neha@marrylocal.test';

async function login(page, email = NEHA_EMAIL) {
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(PASSWORD);

  const [response] = await Promise.all([
    page.waitForResponse(
      res => res.url().includes('/api/v1/auth/login') && res.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Sign In' }).click(),
  ]);

  expect(response.status()).toBe(200);
  await expect(page).toHaveURL(/\/dashboard\/search/);
}

async function openDiscovery(page) {
  const initialResponse = page.waitForResponse(
    res => res.url().includes('/api/v1/profiles/discovery') && res.request().method() === 'GET',
  );

  await page.goto('/dashboard/search');
  await expect((await initialResponse).status()).toBe(200);
  await expect(page.getByTestId('discovery-feed')).toBeVisible();
}

async function authToken(page) {
  const token = await page.evaluate(() => window.localStorage.getItem('marrylocal.auth.token'));
  expect(token).toBeTruthy();
  return token;
}

function paginationProfile(id, firstName, age) {
  return {
    id,
    shortid: `page-profile-${id}`,
    user_handle: `page_profile_${id}`,
    first_name: firstName,
    last_name: 'Tester',
    age,
    gender: 'Male',
    city: 'Delhi',
    state: 'Delhi',
    distance_km: 4.2,
    images: [],
    is_liked: false,
    is_shortlisted: false,
  };
}

function paginationResponse(profiles, hasMore, pageNumber = 1) {
  return JSON.stringify({
    status: 'success',
    data: {
      profiles,
      pagination: {
        page: pageNumber,
        per_page: 15,
        total: 12,
        total_pages: hasMore ? 2 : 1,
        has_next_page: hasMore,
        has_more: hasMore,
        next_cursor: hasMore ? pageNumber + 1 : null,
      },
      locale: {
        search_mode: 'radius',
        radius_km: 300,
        city: 'Delhi',
        latitude: 28.6139,
        longitude: 77.209,
      },
      search_mode: 'radius',
      has_more: hasMore,
      next_cursor: hasMore ? pageNumber + 1 : null,
      features: { community_search_enabled: true },
    },
  });
}

test.describe.serial('discovery radius and full city', () => {
  test('Test 1: caps radius at 300 km and backend clamps larger values', async ({ page }) => {
    await login(page);
    await openDiscovery(page);

    const radiusInput = page.locator('#radius_km');
    await expect(radiusInput).toHaveAttribute('max', '300');
    await expect(radiusInput).not.toHaveAttribute('max', '500');

    await radiusInput.fill('300');

    const [response] = await Promise.all([
      page.waitForResponse(
        res => res.url().includes('/api/v1/profiles/discovery') && res.request().method() === 'GET',
      ),
      page.getByRole('button', { name: 'Apply' }).click(),
    ]);

    const url = new URL(response.url());
    expect(url.searchParams.get('radius_km')).toBe('300');
    expect(url.searchParams.get('full_city')).toBe('false');

    const token = await authToken(page);
    const clamped = await page.request.get(`${API_URL}/api/v1/profiles/discovery?radius_km=500`, {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(clamped.status()).toBe(200);
    expect((await clamped.json()).data.locale.radius_km).toBe(300);
  });

  test('Test 2: Full City is staged behind Apply and keeps card distances', async ({ page }) => {
    await login(page);
    await openDiscovery(page);

    const discoveryRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/v1/profiles/discovery')) {
        discoveryRequests.push(request.url());
      }
    });

    const fullCityToggle = page.getByTestId('discovery-full-city');
    const radiusInput = page.locator('#radius_km');

    const beforeToggle = discoveryRequests.length;
    await fullCityToggle.click();

    await expect(fullCityToggle).toHaveAttribute('aria-checked', 'true');
    await expect(radiusInput).toBeDisabled();
    await page.waitForTimeout(800);
    expect(discoveryRequests.length).toBe(beforeToggle);

    await page.locator('#age_from').fill('21');
    await page.locator('#age_to').fill('30');
    await page.locator('#religion').selectOption('Hindu');
    await page.locator('#community').selectOption('Arora');

    const [fullCityResponse] = await Promise.all([
      page.waitForResponse(
        res =>
          res.url().includes('/api/v1/profiles/discovery') &&
          new URL(res.url()).searchParams.get('search_mode') === 'full_city',
      ),
      page.getByRole('button', { name: 'Apply' }).click(),
    ]);

    const fullCityUrl = new URL(fullCityResponse.url());
    expect(fullCityUrl.searchParams.get('full_city')).toBe('true');

    const cards = page.getByTestId('profile-card');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    for (let index = 0; index < cardCount; index += 1) {
      const card = cards.nth(index);
      await expect(card).toContainText('Delhi');
      await expect(card).toContainText(/(?:~?\d+(?:\.\d+)?\s*(?:km|m)\s*away)/i);
    }

    const beforeDisable = discoveryRequests.length;
    await fullCityToggle.click();
    await expect(fullCityToggle).toHaveAttribute('aria-checked', 'false');
    await expect(radiusInput).toBeEnabled();
    await page.waitForTimeout(800);
    expect(discoveryRequests.length).toBe(beforeDisable);
  });

  test('Test 3: sort resets to page 1 and infinite scroll fetches one page 2', async ({ page }) => {
    await login(page);
    await openDiscovery(page);

    const pageOneProfiles = Array.from({ length: 9 }, (_, index) =>
      paginationProfile(900 + index, `PageOne${index + 1}`, 24 + index),
    );
    const pageTwoProfiles = Array.from({ length: 3 }, (_, index) =>
      paginationProfile(950 + index, `PageTwo${index + 1}`, 40 + index),
    );

    const pageOneRequests = [];
    const pageTwoRequests = [];

    await page.route('**/api/v1/profiles/discovery**', async route => {
      const url = new URL(route.request().url());
      const pageNumber = Number(url.searchParams.get('page') || '1');

      if (pageNumber === 1) {
        pageOneRequests.push(url);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: paginationResponse(pageOneProfiles, true, 1),
        });
        return;
      }

      pageTwoRequests.push(url);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: paginationResponse(pageTwoProfiles, false, 2),
      });
    });

    await page.getByTestId('discovery-sort-trigger').click();
    await page.getByRole('option', { name: 'Sort by Age' }).click();

    await expect
      .poll(() =>
        pageOneRequests.some(
          url => url.searchParams.get('sort_by') === 'age' && url.searchParams.get('page') === '1',
        ),
      )
      .toBe(true);

    expect(pageOneRequests[0].searchParams.get('page')).toBe('1');
    expect(pageOneRequests[0].searchParams.get('sort_by')).toBe('age');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await expect.poll(() => pageTwoRequests.length).toBe(1);
    expect(pageTwoRequests[0].searchParams.get('page')).toBe('2');
    expect(pageTwoRequests[0].searchParams.get('sort_by')).toBe('age');

    await page.waitForTimeout(800);
    expect(pageTwoRequests.length).toBe(1);
  });

  test('Test 4: backend rate limiting returns 429 and UI stops retrying', async ({ page }) => {
    await login(page);
    await openDiscovery(page);

    const token = await authToken(page);

    const burstResponses = await Promise.all(
      Array.from({ length: 25 }, () =>
        page.request.get(`${API_URL}/api/v1/profiles/discovery?search_mode=full_city&per_page=1`, {
          headers: { authorization: `Bearer ${token}` },
        }),
      ),
    );
    const statuses = burstResponses.map(response => response.status());

    expect(statuses).toContain(429);

    let limitedRequests = 0;

    await page.route('**/api/v1/profiles/discovery**', async route => {
      limitedRequests += 1;
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          message: 'Too many search requests. Please wait a moment before trying again.',
        }),
      });
    });

    // Change an applied filter so Apply creates a new query key and fires a request.
    await page.locator('#radius_km').fill('200');
    await page.getByRole('button', { name: 'Apply' }).click();

    await expect(
      page
        .getByRole('region', { name: 'Notifications alt+T' })
        .getByText('Too many search requests. Please wait a moment before trying again.', {
          exact: true,
        }),
    ).toBeVisible();

    await page.waitForTimeout(1200);
    expect(limitedRequests).toBe(1);
  });
});
