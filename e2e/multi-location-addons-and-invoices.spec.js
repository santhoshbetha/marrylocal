import { test, expect } from '@playwright/test';

const nowIso = () => new Date().toISOString();
const futureIso = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const pastIso = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const viewer = {
  id: 77,
  email: 'multi.location@example.com',
  first_name: 'Aarav',
  last_name: 'Tester',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
  city: 'Hyderabad',
  state: 'Telangana',
  latitude: 17.385,
  longitude: 78.4867,
  location_2_active: false,
  location_2_city: null,
  location_2_state: null,
  location_3_active: false,
  location_3_city: null,
  location_3_state: null,
};

const state = {
  profile: { ...viewer },
  invoices: [],
  discoverySlots: [],
  checkoutItems: [],
};

function normalizedPair(locationState, city) {
  const normalizedState = String(locationState || '')
    .trim()
    .toLowerCase();
  const normalizedCity = String(city || '')
    .trim()
    .toLowerCase();

  return normalizedState && normalizedCity ? `${normalizedState}|${normalizedCity}` : null;
}

function duplicateForSlot(profile, slot, locationState, city) {
  const target = normalizedPair(locationState, city);
  if (!target) return false;

  const pairs = [];

  if (slot !== 'primary' && profile.state && profile.city) {
    pairs.push([profile.state, profile.city]);
  }
  if (slot !== 'location_2' && profile.location_2_active) {
    pairs.push([profile.location_2_state, profile.location_2_city]);
  }
  if (slot !== 'location_3' && profile.location_3_active) {
    pairs.push([profile.location_3_state, profile.location_3_city]);
  }

  return pairs.some(([pairState, pairCity]) => normalizedPair(pairState, pairCity) === target);
}

function invoiceFor(itemType, description) {
  return {
    id: state.invoices.length + 1,
    invoice_number: `INV-2026-${String(state.invoices.length + 1).padStart(6, '0')}`,
    item_type: itemType,
    description,
    base_amount_inr: '100.00',
    gst_amount_inr: '18.00',
    total_amount_inr: '118.00',
    period_start: nowIso(),
    period_end: futureIso(),
    payment_reference: `mock-${state.invoices.length + 1}`,
    pdf_url: null,
    status: 'paid',
    inserted_at: nowIso(),
  };
}

function activateLocation(slot, city, locationState) {
  const suffix = slot === 'location2' ? 'location_2' : 'location_3';
  state.profile[`${suffix}_active`] = true;
  state.profile[`${suffix}_city`] = city;
  state.profile[`${suffix}_state`] = locationState;
  state.profile[`${suffix}_expires_at`] = futureIso();
  state.profile[`${suffix}_change_locked`] = false;

  state.invoices.unshift(
    invoiceFor(
      `addon_${suffix}`,
      slot === 'location2'
        ? 'Second Location Addon (30-Day Monthly Subscription)'
        : 'Third Location Addon (30-Day Monthly Subscription)',
    ),
  );
}

async function installApiMocks(page) {
  await page.addInitScript(
    ({ user }) => {
      window.localStorage.setItem('marrylocal.auth.token', 'multi-location-token');
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { user: viewer },
  );

  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;

    const json = body =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });

    if (path.endsWith('/profiles/me/location') && method === 'PATCH') {
      const payload = request.postDataJSON();
      const slot = payload.slot;

      if (duplicateForSlot(state.profile, slot, payload.state, payload.city)) {
        return route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'error',
            message: 'You already have this city assigned to another active location.',
          }),
        });
      }

      if (slot === 'primary') {
        state.profile.city = payload.city;
        state.profile.state = payload.state;
        state.profile.latitude = payload.latitude;
        state.profile.longitude = payload.longitude;
      } else if (slot === 'location_2') {
        state.profile.location_2_city = payload.city;
        state.profile.location_2_state = payload.state;
        state.profile.location_2_latitude = payload.latitude;
        state.profile.location_2_longitude = payload.longitude;
        state.profile.location_2_last_changed_at = nowIso();
        state.profile.location_2_allow_change_at = futureIso();
        state.profile.location_2_change_locked = true;
      } else if (slot === 'location_3') {
        state.profile.location_3_city = payload.city;
        state.profile.location_3_state = payload.state;
        state.profile.location_3_latitude = payload.latitude;
        state.profile.location_3_longitude = payload.longitude;
        state.profile.location_3_last_changed_at = nowIso();
        state.profile.location_3_allow_change_at = futureIso();
        state.profile.location_3_change_locked = true;
      }

      return json({ status: 'success', data: { profile: state.profile } });
    }

    if (path.endsWith('/profiles/me') && method === 'GET') {
      return json({ status: 'success', data: { profile: state.profile } });
    }

    if (path.endsWith('/profiles/me') && method === 'PATCH') {
      state.profile = { ...state.profile, ...request.postDataJSON() };
      return json({ status: 'success', data: { profile: state.profile } });
    }

    if (path.endsWith('/profiles/discovery')) {
      const slot = url.searchParams.get('location_slot') || 'primary';
      state.discoverySlots.push(slot);

      const city =
        slot === 'location_2'
          ? state.profile.location_2_city
          : slot === 'location_3'
            ? state.profile.location_3_city
            : state.profile.city;

      return json({
        status: 'success',
        data: {
          profiles: [],
          pagination: {
            page: 1,
            per_page: 15,
            total: 0,
            total_pages: 0,
            has_next_page: false,
          },
          locale: {
            search_mode:
              url.searchParams.get('search_mode') === 'full_city' ? 'full_city' : 'radius',
            radius_km: 100,
            city,
            location_slot: slot,
            latitude: 17.385,
            longitude: 78.4867,
          },
          search_mode: url.searchParams.get('search_mode') === 'full_city' ? 'full_city' : 'radius',
          has_more: false,
        },
      });
    }

    if (path.includes('/payments/initialize-checkout') && method === 'POST') {
      const items = request.postDataJSON()?.items || {};
      state.checkoutItems.push(items);

      if (items.location2) {
        activateLocation('location2', items.location2.city, items.location2.state);
      }
      if (items.location3) {
        activateLocation('location3', items.location3.city, items.location3.state);
      }

      return json({
        status: 'success',
        data: { redirect_url: '/addons?checkout=success' },
      });
    }

    if (path.endsWith('/billing/invoices')) {
      return json({ status: 'success', data: { invoices: state.invoices } });
    }

    if (path.endsWith('/payments/transactions')) {
      return json({ status: 'success', data: { transactions: [] } });
    }

    if (path.includes('/notifications')) {
      return json({
        status: 'success',
        data: { notifications: [], pagination: { page: 1, total: 0 }, unread_count: 0 },
      });
    }

    if (path.includes('/relationships/moderated')) {
      return json({
        status: 'success',
        data: { kind: 'moderated', blocked: [], muted: [], counts: { blocked: 0, muted: 0 } },
      });
    }

    if (path.includes('/relationships')) {
      return json({ status: 'success', data: { relationships: [] } });
    }

    return json({ status: 'success', data: {} });
  });
}

async function selectAddonLocation(page, cardText, stateName, cityName) {
  const card = page.locator('article').filter({ hasText: cardText });
  await expect(card).toBeVisible();

  await card.getByRole('combobox').first().click();
  await page.getByRole('option', { name: stateName, exact: true }).click();
  await card.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: cityName, exact: true }).click();
  await card.getByRole('button', { name: 'Add' }).click();
}

test.describe.serial('multi-location addons and invoices', () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page);
  });

  test('Step 1: baseline user sees primary location only', async ({ page }) => {
    state.profile = { ...viewer };
    state.invoices = [];
    state.discoverySlots = [];
    state.checkoutItems = [];

    await page.goto('/dashboard/location');
    await expect(page).toHaveURL(/\/location$/);
    await expect(page.getByTestId('location-tab-primary')).toBeVisible();
    await expect(page.getByTestId('location-tab-location_2')).toHaveCount(0);
    await expect(page.getByTestId('location-tab-location_3')).toHaveCount(0);

    await page.goto('/settings');
    await expect(page.getByText('Location 2', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Location 3', { exact: true })).toHaveCount(0);

    await page.goto('/dashboard/search');
    await expect(page.getByTestId('discovery-location-slot')).toHaveCount(0);
  });

  test('Step 2: buy Location 2, see invoice, pin Bangalore, enforce cooldown', async ({ page }) => {
    await page.goto('/dashboard/addons');
    await expect(page).toHaveURL(/\/addons$/);

    const secondaryCard = page.locator('article').filter({ hasText: 'Secondary Location' });
    await secondaryCard.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Telangana', exact: true }).click();
    await secondaryCard.getByRole('combobox').nth(1).click();
    await expect(
      page.getByRole('option', { name: 'Hyderabad (Already Primary Location)' }),
    ).toBeDisabled();
    await page.keyboard.press('Escape');

    await selectAddonLocation(page, 'Secondary Location', 'Karnataka', 'Bangalore');
    await page.getByRole('button', { name: /PAY/ }).click();
    await page.waitForURL(/\/addons\?checkout=success/);

    expect(state.checkoutItems.at(-1).location2).toMatchObject({
      state: 'Karnataka',
      city: 'Bangalore',
    });
    expect(state.profile.location_2_active).toBe(true);
    expect(state.invoices[0].invoice_number).toMatch(/^INV-2026-/);

    const bypass = await page.evaluate(async () => {
      const token = window.localStorage.getItem('marrylocal.auth.token');
      const response = await window.fetch('/api/v1/profiles/me/location', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slot: 'location_2',
          state: 'Telangana',
          city: 'Hyderabad',
          latitude: 17.385,
          longitude: 78.4867,
        }),
      });

      return { status: response.status, body: await response.json() };
    });

    expect(bypass.status).toBe(422);
    expect(bypass.body.message).toBe(
      'You already have this city assigned to another active location.',
    );

    await page.goto('/settings');
    await expect(page.getByTestId('invoices-receipts')).toBeVisible();
    await expect(page.getByText(state.invoices[0].invoice_number)).toBeVisible();
    await expect(
      page.getByText('Second Location Addon (30-Day Monthly Subscription)'),
    ).toBeVisible();

    await page.goto('/dashboard/location');
    await expect(page.getByTestId('location-tab-location_2')).toBeVisible();
    await expect(page.getByTestId('location-tab-location_3')).toHaveCount(0);

    await page.getByTestId('location-tab-location_2').click();
    await page.locator('#location_2-latitude').fill('12.9716');
    await page.locator('#location_2-longitude').fill('77.5946');
    await page.getByRole('button', { name: 'Use Manual Coordinates' }).click();

    await expect(page.getByText(/Locked until/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use Manual Coordinates' })).toBeDisabled();

    await page.goto('/settings');
    await expect(page.getByText('Location 2', { exact: true })).toBeVisible();
    await expect(page.getByText(/Locked until/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Change Location' })).toBeEnabled();
  });

  test('Step 3: buy Location 3, pin Chennai, switch discovery slots', async ({ page }) => {
    await page.goto('/dashboard/addons');
    const tertiaryCard = page.locator('article').filter({ hasText: 'Tertiary Location' });

    await tertiaryCard.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Telangana', exact: true }).click();
    await tertiaryCard.getByRole('combobox').nth(1).click();
    await expect(
      page.getByRole('option', { name: 'Hyderabad (Already Primary Location)' }),
    ).toBeDisabled();
    await page.keyboard.press('Escape');

    await tertiaryCard.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Karnataka', exact: true }).click();
    await tertiaryCard.getByRole('combobox').nth(1).click();
    await expect(
      page.getByRole('option', { name: 'Bangalore (Already Location 2)' }),
    ).toBeDisabled();
    await page.keyboard.press('Escape');

    await selectAddonLocation(page, 'Tertiary Location', 'Tamil Nadu', 'Chennai');
    await page.getByRole('button', { name: /PAY/ }).click();
    await page.waitForURL(/\/addons\?checkout=success/);

    expect(state.checkoutItems.at(-1).location3).toMatchObject({
      state: 'Tamil Nadu',
      city: 'Chennai',
    });
    expect(state.profile.location_3_active).toBe(true);
    expect(state.invoices.some(item => item.item_type === 'addon_location_3')).toBe(true);

    await page.goto('/dashboard/location');
    await expect(page.getByTestId('location-tab-location_2')).toBeVisible();
    await expect(page.getByTestId('location-tab-location_3')).toBeVisible();

    await page.getByTestId('location-tab-location_3').click();
    await page.locator('#location_3-latitude').fill('13.0827');
    await page.locator('#location_3-longitude').fill('80.2707');
    await page.getByRole('button', { name: 'Use Manual Coordinates' }).click();
    await expect(page.getByText(/Locked until/)).toBeVisible();

    await page.goto('/dashboard/search');
    const selector = page.getByTestId('discovery-location-slot');
    await expect(selector).toBeVisible();

    await selector.selectOption('location_2');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect.poll(() => state.discoverySlots.at(-1)).toBe('location_2');

    await selector.selectOption('location_3');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect.poll(() => state.discoverySlots.at(-1)).toBe('location_3');
  });

  test('Step 4: expired addons disappear and fall back to primary', async ({ page }) => {
    state.profile.location_2_active = false;
    state.profile.location_3_active = false;
    state.profile.location_2_expires_at = pastIso();
    state.profile.location_3_expires_at = pastIso();

    await page.goto('/settings');
    await expect(page.getByText('Location 2', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Location 3', { exact: true })).toHaveCount(0);

    await page.goto('/dashboard/location');
    await expect(page.getByTestId('location-tab-primary')).toBeVisible();
    await expect(page.getByTestId('location-tab-location_2')).toHaveCount(0);
    await expect(page.getByTestId('location-tab-location_3')).toHaveCount(0);

    await page.goto('/dashboard/search');
    await expect(page.getByTestId('discovery-location-slot')).toHaveCount(0);
    await expect.poll(() => state.discoverySlots.at(-1)).toBe('primary');
  });
});
