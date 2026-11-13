import { test, expect } from '@playwright/test';

const SESSION_TOKEN = 'e2e-peer-vouch-token';

const baseProfile = {
  id: 9001,
  email: 'delhi.unverified@marrylocal.test',
  first_name: 'Aarav',
  last_name: 'Delhi',
  user_handle: 'aarav_delhi',
  shortid: 'e2e9001',
  age: 29,
  gender: 'Male',
  city: 'Delhi',
  state: 'Delhi',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
  email_verified: true,
  onboarding_complete: true,
  images: [],
  avatar_url: null,
  peer_verified: false,
  peer_vouches_received: 0,
  is_peer_verifier: false,
  is_available_to_vouch: true,
  seed_verifier_status: 'none',
  vouch_credits_remaining: 0,
  verified_at: null,
  verification_validity_days: 730,
  verification_expires_at: null,
  force_verification_required: false,
  max_search_distance: 100,
};

const delhiVerifiers = [
  {
    id: 9101,
    first_name: 'Meera',
    last_name: 'Sharma',
    user_handle: 'meera_verifier',
    city: 'Delhi',
    distance_km: 1.2,
    is_peer_verifier: true,
    is_available_to_vouch: true,
    vouch_credits_remaining: 5,
    phone_number: '9811100011',
  },
  {
    id: 9102,
    first_name: 'Kabir',
    last_name: 'Malhotra',
    user_handle: 'kabir_verifier',
    city: 'Delhi',
    distance_km: 2.8,
    is_peer_verifier: true,
    is_available_to_vouch: true,
    vouch_credits_remaining: 5,
    phone_number: null,
  },
  {
    id: 9103,
    first_name: 'Ananya',
    last_name: 'Rao',
    user_handle: 'ananya_verifier',
    city: 'Delhi',
    distance_km: 4.1,
    is_peer_verifier: true,
    is_available_to_vouch: true,
    vouch_credits_remaining: 5,
    phone_number: '9811100033',
  },
  {
    id: 9104,
    first_name: 'Mumbai',
    last_name: 'Verifier',
    user_handle: 'mumbai_verifier',
    city: 'Mumbai',
    distance_km: 1100,
    is_peer_verifier: true,
    is_available_to_vouch: true,
    vouch_credits_remaining: 5,
    phone_number: null,
  },
  {
    id: 9105,
    first_name: 'No',
    last_name: 'Credits',
    user_handle: 'no_credits',
    city: 'Delhi',
    distance_km: 3.4,
    is_peer_verifier: true,
    is_available_to_vouch: true,
    vouch_credits_remaining: 0,
    phone_number: null,
  },
  {
    id: 9106,
    first_name: 'Busy',
    last_name: 'Verifier',
    user_handle: 'busy_verifier',
    city: 'Delhi',
    distance_km: 3.9,
    is_peer_verifier: true,
    is_available_to_vouch: false,
    vouch_credits_remaining: 5,
    phone_number: null,
  },
];

const nearbyVerifiers = () =>
  delhiVerifiers.filter(
    verifier =>
      verifier.city === 'Delhi' &&
      verifier.is_peer_verifier === true &&
      verifier.is_available_to_vouch === true &&
      verifier.vouch_credits_remaining > 0,
  );

async function seedSession(page, user) {
  await page.addInitScript(
    ({ token, sessionUser }) => {
      window.localStorage.setItem('marrylocal.auth.token', token);
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(sessionUser));
    },
    { token: SESSION_TOKEN, sessionUser: user },
  );
}

async function mockShell(page, state) {
  await page.route('**/api/v1/profiles/me', async route => {
    if (route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON() || {};
      state.patchPayloads.push(payload);
      state.profile = { ...state.profile, ...payload };

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

  await page.route('**/api/v1/billing/invoices', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { invoices: [] } }),
    });
  });

  await page.route('**/api/v1/verifications/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { verification: null } }),
    });
  });

  await page.route('**/api/v1/profiles/discovery**', async route => {
    state.discoveryRequests += 1;

    if (state.profile.force_verification_required) {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          code: 'VERIFICATION_REQUIRED',
          message: 'Identity verification is required to continue searching in your area.',
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
          profiles: [],
          locale: {
            latitude: null,
            longitude: null,
            city: state.profile.city,
            radius_km: null,
            search_mode: 'full_city',
            location_slot: 'primary',
          },
          pagination: {
            total: 0,
            page: 1,
            total_pages: 0,
            per_page: 15,
            has_next_page: false,
            has_more: false,
            next_cursor: null,
          },
          has_more: false,
          next_cursor: null,
          search_mode: 'full_city',
        },
      }),
    });
  });
}

async function mockNearestVerifiers(page, state) {
  await page.route('**/api/v1/vouch/nearest-verifiers', async route => {
    let verifiers = nearbyVerifiers();

    if (state.verifierDirectory === false) {
      verifiers = verifiers.filter(verifier => verifier.id !== state.profile.id);
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { city: 'Delhi', count: verifiers.length, verifiers },
      }),
    });
  });
}

async function mockVouching(page, state) {
  await page.route('**/api/v1/vouch/generate-token', async route => {
    state.tokenRequests += 1;
    const token = `e2e-vouch-token-${state.tokenRequests}`;
    state.issuedTokens.push(token);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        secure_token: token,
        expires_in: 60,
        data: { secure_token: token, expires_in: 60 },
      }),
    });
  });

  await page.route('**/api/v1/vouch/verify-peer', async route => {
    const payload = route.request().postDataJSON() || {};
    const token = payload.secure_token;
    const authorization = route.request().headers().authorization || '';
    const voucherId = authorization.replace(/^Bearer\s+/, '');

    state.verificationRequests.push({ token, voucherId });

    if (!token || state.usedTokens.has(token)) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          code: 'token_invalid',
          message: 'This QR code is invalid or has already been scanned.',
        }),
      });
      return;
    }

    if (state.usedVouchers.has(voucherId)) {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          code: 'duplicate_vouch',
          message: 'You have already vouched for this member.',
        }),
      });
      return;
    }

    state.usedTokens.add(token);
    state.usedVouchers.add(voucherId);

    const currentVouches = state.profile.peer_vouches_received + 1;
    const peerVerified = currentVouches >= 1;
    const isPeerVerifier = currentVouches >= 3;

    state.profile = {
      ...state.profile,
      peer_vouches_received: currentVouches,
      peer_verified: peerVerified,
      is_peer_verifier: isPeerVerifier,
      vouch_credits_remaining: isPeerVerifier ? 5 : 0,
      verified_at: state.profile.verified_at ?? new Date().toISOString(),
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        message: 'Peer vouch recorded.',
        current_vouches: currentVouches,
        peer_verified: peerVerified,
        is_peer_verifier: isPeerVerifier,
        vouch_credits_remaining: state.profile.vouch_credits_remaining,
        data: {
          current_vouches: currentVouches,
          peer_verified: peerVerified,
          is_peer_verifier: isPeerVerifier,
          vouch_credits_remaining: state.profile.vouch_credits_remaining,
        },
      }),
    });
  });
}

function newState(overrides = {}) {
  return {
    profile: { ...baseProfile, ...overrides },
    tokenRequests: 0,
    issuedTokens: [],
    usedTokens: new Set(),
    usedVouchers: new Set(),
    verificationRequests: [],
    patchPayloads: [],
    discoveryRequests: 0,
    verifierDirectory: true,
    approvedSeedVerifiers: 0,
    optedOut: false,
    optedIn: false,
  };
}

async function vouchAs(page, verifierId) {
  const tokenResponse = await page.evaluate(async () => {
    const response = await fetch('/api/v1/vouch/generate-token', { method: 'POST' });
    return { status: response.status, body: await response.json() };
  });

  expect(tokenResponse.status).toBe(200);
  expect(tokenResponse.body.expires_in).toBe(60);

  return page.evaluate(
    async ({ secureToken, authorization }) => {
      const response = await fetch('/api/v1/vouch/verify-peer', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authorization}`,
        },
        body: JSON.stringify({ secure_token: secureToken }),
      });

      return { status: response.status, body: await response.json() };
    },
    { secureToken: tokenResponse.body.secure_token, authorization: verifierId },
  );
}

test('one vouch unlocks access and three vouches unlock the verify-five scanner', async ({
  page,
}) => {
  const state = newState();

  await seedSession(page, state.profile);
  await mockShell(page, state);
  await mockNearestVerifiers(page, state);
  await mockVouching(page, state);

  await page.goto('/verify');

  await expect(page.getByRole('heading', { name: 'Identity verification' })).toBeVisible();
  await expect(page.getByTestId('verify-mode-peer')).toHaveClass(/bg-primary/);
  await expect(page.getByTestId('peer-vouch-count')).toHaveText('0 / 3');
  await expect(page.getByTestId('vouch-qr')).toBeVisible();
  await expect(page.getByTestId('vouch-countdown')).toContainText('Rotating in');
  await expect(page.getByTestId('milestone-access')).toContainText('Locked');
  await expect(page.getByTestId('milestone-verifier')).toContainText('Locked');

  await expect(page.getByTestId('peer-vouch-guidance')).toContainText('government ID');
  await expect(page.getByTestId('peer-vouch-guidance')).toContainText('One vouch unlocks');
  await expect(page.getByTestId('vouch-qr')).toBeVisible();
  await expect(
    page.getByText('You do not need to know the verifier beforehand', { exact: false }).first(),
  ).toBeVisible();

  await expect(page.getByTestId('nearest-verifier-9101')).toContainText('Meera Sharma');
  await expect(page.getByTestId('nearest-verifier-9102')).toContainText('Kabir Malhotra');
  await expect(page.getByTestId('nearest-verifier-9103')).toContainText('Ananya Rao');
  await expect(page.getByTestId('nearest-verifier-9104')).toHaveCount(0);
  await expect(page.getByTestId('nearest-verifier-9105')).toHaveCount(0);
  await expect(page.getByTestId('nearest-verifier-9106')).toHaveCount(0);
  await expect(page.getByTestId('vouch-subtab-scan')).toBeDisabled();

  const first = await vouchAs(page, 'delhi-verifier-one');
  expect(first.status).toBe(200);
  expect(first.body.current_vouches).toBe(1);
  expect(first.body.peer_verified).toBe(true);
  expect(first.body.is_peer_verifier).toBe(false);
  expect(first.body.vouch_credits_remaining).toBe(0);

  await page.reload();

  await expect(page.getByTestId('peer-vouch-count')).toHaveText('1 / 3');
  await expect(page.getByTestId('milestone-access')).toContainText('Unlocked');
  await expect(page.getByTestId('milestone-verifier')).toContainText('Locked');
  await expect(page.getByTestId('peer-verified-status')).toHaveText('Peer Verified');
  await expect(page.getByTestId('peer-verified-badge').first()).toBeVisible();
  await expect(page.getByTestId('vouch-subtab-scan')).toBeDisabled();

  const second = await vouchAs(page, 'delhi-verifier-two');
  expect(second.body.current_vouches).toBe(2);
  expect(second.body.peer_verified).toBe(true);
  expect(second.body.is_peer_verifier).toBe(false);

  const third = await vouchAs(page, 'delhi-verifier-three');
  expect(third.body.current_vouches).toBe(3);
  expect(third.body.peer_verified).toBe(true);
  expect(third.body.is_peer_verifier).toBe(true);
  expect(third.body.vouch_credits_remaining).toBe(5);

  await page.reload();

  await expect(page.getByTestId('peer-vouch-count')).toHaveText('3 / 3');
  await expect(page.getByTestId('milestone-verifier')).toContainText('Unlocked');
  await expect(page.getByTestId('vouch-credits')).toContainText('5 / 5 Credits Left');
  await expect(page.getByTestId('vouch-subtab-scan')).toBeEnabled();

  await page.getByTestId('vouch-subtab-scan').click();
  await expect(page.getByTestId('peer-scanner-reader')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start camera' })).toBeVisible();

  const duplicate = await vouchAs(page, 'delhi-verifier-one');
  expect(duplicate.status).toBe(422);
  expect(duplicate.body.code).toBe('duplicate_vouch');
});

test('seed verifier banner opts out through a confirmation dialog and disappears', async ({
  page,
}) => {
  const state = newState({
    seed_verifier_status: 'invited',
    city: 'Hyderabad',
    state: 'Telangana',
  });

  await seedSession(page, state.profile);
  await mockShell(page, state);
  await mockNearestVerifiers(page, state);
  await mockVouching(page, state);

  await page.route('**/api/v1/vouch/seed-opt-in', async route => {
    state.optedIn = true;
    state.profile = { ...state.profile, seed_verifier_status: 'opted_in' };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { profile: { seed_verifier_status: 'opted_in' } },
      }),
    });
  });

  await page.route('**/api/v1/vouch/seed-opt-out', async route => {
    state.optedOut = true;
    // The backend marks the member opted out and enqueues the recruitment
    // worker so the next eligible member in the city is invited.
    state.profile = { ...state.profile, seed_verifier_status: 'opted_out' };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { profile: { seed_verifier_status: 'opted_out' } },
      }),
    });
  });

  await page.goto('/verify');

  const banner = page.getByTestId('seed-verifier-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('first 10 seed verifiers');
  await expect(banner).toContainText('50 opposite-gender members');
  await expect(banner).toContainText('verify@marrylocal.in');
  await expect(page.getByTestId('seed-opt-in')).toBeVisible();

  await page.getByTestId('seed-opt-out').click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Opt out of seed verification?');
  await page.getByTestId('seed-opt-out-confirm').click();

  await expect(banner).toHaveCount(0);
  expect(state.optedOut).toBe(true);
  expect(state.optedIn).toBe(false);
});

test('master gate stays inactive until ten seed verifiers are approved', async ({ page }) => {
  const state = newState({
    force_verification_required: false,
    around_user_count: 67,
  });

  await seedSession(page, state.profile);
  await mockShell(page, state);

  await page.goto('/dashboard/search');
  await expect(page.getByTestId('verification-gate-banner')).toHaveCount(0);
  expect(state.discoveryRequests).toBeGreaterThan(0);

  // The server only flips the gate once ten seed verifiers in the city have
  // opted in and had their documents approved.
  state.approvedSeedVerifiers = 10;
  state.profile = { ...state.profile, force_verification_required: true };
  state.discoveryRequests = 0;

  await page.evaluate(user => {
    window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
  }, state.profile);

  await page.reload();

  await expect(page.getByTestId('verification-gate-banner')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Identity Verification Required' })).toBeVisible();
  expect(state.discoveryRequests).toBe(0);
});

test('verifier availability toggle controls visibility and disappears at zero credits', async ({
  page,
}) => {
  const state = newState({
    peer_verified: true,
    is_peer_verifier: true,
    peer_vouches_received: 3,
    vouch_credits_remaining: 5,
    is_available_to_vouch: true,
    verified_at: '2026-01-15T10:00:00Z',
    verification_expires_at: '2028-01-15T10:00:00Z',
  });

  await seedSession(page, state.profile);
  await mockShell(page, state);

  await page.route('**/api/v1/vouch/nearest-verifiers', async route => {
    const included =
      state.profile.is_available_to_vouch !== false && state.profile.vouch_credits_remaining > 0;
    const verifiers = included ? [{ ...delhiVerifiers[0], id: state.profile.id }] : [];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { city: 'Delhi', count: verifiers.length, verifiers },
      }),
    });
  });

  await page.goto('/settings');

  const card = page.getByTestId('peer-availability-card');
  const toggle = page.getByTestId('settings-peer-availability');

  await expect(card).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');

  await toggle.click();
  await expect.poll(() => state.patchPayloads.length).toBe(1);
  expect(state.patchPayloads[0]).toEqual({ is_available_to_vouch: false });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(card).toContainText('Paused');

  const hidden = await page.evaluate(async () => {
    const response = await fetch('/api/v1/vouch/nearest-verifiers');
    return response.json();
  });

  expect(hidden.data.verifiers).toHaveLength(0);

  await toggle.click();
  await expect.poll(() => state.patchPayloads.length).toBe(2);
  expect(state.patchPayloads[1]).toEqual({ is_available_to_vouch: true });

  const visible = await page.evaluate(async () => {
    const response = await fetch('/api/v1/vouch/nearest-verifiers');
    return response.json();
  });

  expect(visible.data.verifiers).toHaveLength(1);

  state.profile = { ...state.profile, vouch_credits_remaining: 0 };
  await page.reload();

  await expect(page.getByTestId('peer-availability-card')).toHaveCount(0);
});

test('verification shows an active card while valid and reopens after expiry', async ({ page }) => {
  const now = Date.now();
  const validProfile = newState({
    peer_verified: true,
    peer_vouches_received: 3,
    is_peer_verifier: false,
    vouch_credits_remaining: 0,
    verified_at: new Date(now - 10 * 86_400_000).toISOString(),
    verification_validity_days: 730,
    verification_expires_at: new Date(now + 720 * 86_400_000).toISOString(),
  });

  await seedSession(page, validProfile.profile);
  await mockShell(page, validProfile);
  await mockNearestVerifiers(page, validProfile);
  await mockVouching(page, validProfile);

  await page.goto('/verify');

  const activeCard = page.getByTestId('verification-active-card');
  await expect(activeCard).toBeVisible();
  await expect(activeCard).toContainText('Verification Active');
  await expect(activeCard).toContainText('Verified on');
  await expect(activeCard).toContainText('Renews on');
  await expect(page.getByTestId('vouch-qr')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Verify', exact: true })).toHaveCount(0);
  // After the validity window the daily sweep clears the trust flags, so the
  // verification forms must be reachable again.
  validProfile.profile = {
    ...validProfile.profile,
    peer_verified: false,
    peer_vouches_received: 0,
    is_peer_verifier: false,
    vouch_credits_remaining: 0,
    verified_at: null,
    verification_expires_at: null,
  };

  await page.evaluate(user => {
    window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
  }, validProfile.profile);

  await page.reload();

  await expect(page.getByTestId('verification-active-card')).toHaveCount(0);
  await expect(page.getByTestId('verify-mode-peer')).toBeVisible();
  await expect(page.getByTestId('vouch-qr')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Verify', exact: true }).first()).toBeVisible();
});
