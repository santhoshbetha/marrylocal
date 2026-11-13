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
  vouch_credits_remaining: 0,
};

const delhiVerifiers = [
  {
    id: 9101,
    first_name: 'Meera',
    last_name: 'Sharma',
    user_handle: 'meera_verifier',
    city: 'Delhi',
    distance_km: 1.2,
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
    vouch_credits_remaining: 0,
    phone_number: null,
  },
];

async function seedSession(page, user) {
  await page.addInitScript(
    ({ token, sessionUser }) => {
      window.localStorage.setItem('marrylocal.auth.token', token);
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(sessionUser));
    },
    { token: SESSION_TOKEN, sessionUser: user },
  );
}

test('peer vouching reaches three local vouches, unlocks scanning, and rejects duplicates', async ({
  page,
}) => {
  const state = {
    profile: { ...baseProfile },
    tokenRequests: 0,
    issuedTokens: [],
    usedTokens: new Set(),
    usedVouchers: new Set(),
    verificationRequests: [],
  };

  await seedSession(page, state.profile);

  await page.route('**/api/v1/profiles/me', async route => {
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

  await page.route('**/api/v1/verifications/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { verification: null } }),
    });
  });

  await page.route('**/api/v1/vouch/nearest-verifiers', async route => {
    const verifiers = delhiVerifiers.filter(
      verifier => verifier.city === 'Delhi' && verifier.vouch_credits_remaining > 0,
    );

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { city: 'Delhi', count: verifiers.length, verifiers },
      }),
    });
  });

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
    const payload = JSON.parse(route.request().postData() || '{}');
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
    state.profile = {
      ...state.profile,
      peer_vouches_received: currentVouches,
      peer_verified: currentVouches >= 3,
      vouch_credits_remaining: currentVouches >= 3 ? 5 : 0,
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        message: 'Peer vouch recorded.',
        current_vouches: currentVouches,
        peer_verified: state.profile.peer_verified,
        vouch_credits_remaining: state.profile.vouch_credits_remaining,
        data: {
          current_vouches: currentVouches,
          peer_verified: state.profile.peer_verified,
          vouch_credits_remaining: state.profile.vouch_credits_remaining,
        },
      }),
    });
  });

  await page.goto('/verify');

  await expect(page.getByRole('heading', { name: 'Identity verification' })).toBeVisible();
  await expect(page.getByTestId('verify-mode-peer')).toHaveClass(/bg-primary/);
  await expect(page.getByTestId('peer-vouch-count')).toHaveText('0 / 3');
  await expect(page.getByTestId('vouch-qr')).toBeVisible();
  await expect(page.getByTestId('vouch-countdown')).toContainText('Rotating in');
  await expect(page.getByTestId('peer-vouch-guidance')).toContainText('How to get verified');
  await expect(page.getByTestId('peer-vouch-guidance')).toContainText('WhatsApp or Zoom');
  await expect(page.getByTestId('peer-vouch-guidance')).toContainText('meet in person');

  await expect(page.getByTestId('nearest-verifiers')).toBeVisible();
  await expect(page.getByTestId('nearest-verifier-9101')).toContainText('Meera Sharma');
  await expect(page.getByTestId('nearest-verifier-9102')).toContainText('Kabir Malhotra');
  await expect(page.getByTestId('nearest-verifier-9103')).toContainText('Ananya Rao');
  await expect(page.getByTestId('nearest-verifier-9104')).toHaveCount(0);
  await expect(page.getByTestId('nearest-verifier-9105')).toHaveCount(0);
  await expect(page.getByTestId('vouch-subtab-scan')).toBeDisabled();

  expect(state.tokenRequests).toBeGreaterThanOrEqual(1);

  const verifierTokens = ['verified-member-1', 'verified-member-2', 'verified-member-3'];

  for (const [index, verifierToken] of verifierTokens.entries()) {
    const tokenResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/vouch/generate-token', { method: 'POST' });
      return { status: response.status, body: await response.json() };
    });

    expect(tokenResponse.status).toBe(200);
    expect(tokenResponse.body.expires_in).toBe(60);

    const token = tokenResponse.body.secure_token;

    const vouchResponse = await page.evaluate(
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
      { secureToken: token, authorization: verifierToken },
    );

    expect(vouchResponse.status).toBe(200);
    expect(vouchResponse.body.current_vouches).toBe(index + 1);

    if (index < 2) {
      expect(vouchResponse.body.peer_verified).toBe(false);
    }
  }

  await page.reload();

  await expect(page.getByTestId('peer-vouch-count')).toHaveText('3 / 3');
  await expect(page.getByTestId('peer-verified-status')).toHaveText('Peer Verified');
  await expect(page.getByTestId('peer-verified-badge').first()).toBeVisible();
  await expect(page.getByTestId('vouch-credits')).toContainText('5 / 5 Credits Left');
  await expect(page.getByTestId('vouch-subtab-scan')).toBeEnabled();

  await page.getByTestId('vouch-subtab-scan').click();
  await expect(page.getByTestId('peer-scanner-reader')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start camera' })).toBeVisible();

  const duplicateTokenResponse = await page.evaluate(async () => {
    const response = await fetch('/api/v1/vouch/generate-token', { method: 'POST' });
    return { status: response.status, body: await response.json() };
  });

  const duplicateResponse = await page.evaluate(
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
    { secureToken: duplicateTokenResponse.body.secure_token, authorization: verifierTokens[0] },
  );

  expect(duplicateResponse.status).toBe(422);
  expect(duplicateResponse.body.code).toBe('duplicate_vouch');
  expect(state.profile.peer_verified).toBe(true);
  expect(state.profile.vouch_credits_remaining).toBe(5);
});
