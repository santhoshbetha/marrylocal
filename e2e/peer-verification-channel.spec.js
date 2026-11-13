import { test, expect } from '@playwright/test';

const SESSION_TOKEN = 'e2e-peer-channel-token';
const USER_ID = 9201;

const baseProfile = {
  id: USER_ID,
  email: 'channel.vouchee@marrylocal.test',
  first_name: 'Aarav',
  last_name: 'Channel',
  user_handle: 'aarav_channel',
  shortid: 'e2e9201',
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

async function seedSession(page) {
  await page.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem('marrylocal.auth.token', token);
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { token: SESSION_TOKEN, user: baseProfile },
  );
}

function channelFrame(topic, event, payload) {
  return JSON.stringify([null, null, topic, event, payload]);
}

test('verification page updates from a channel push and never polls the profile', async ({
  page,
}) => {
  const state = {
    profile: { ...baseProfile },
    profileRequests: 0,
  };

  let channelSocket = null;

  await page.routeWebSocket(/\/socket\/websocket/, ws => {
    channelSocket = ws;
    ws.onMessage(() => {
      // The minimal fake server ignores phx_join and heartbeat frames.
    });
  });

  await seedSession(page);

  await page.route('**/api/v1/profiles/me', async route => {
    state.profileRequests += 1;

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
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { city: 'Delhi', count: 0, verifiers: [] },
      }),
    });
  });

  await page.route('**/api/v1/vouch/generate-token', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        secure_token: 'channel-test-token',
        expires_in: 60,
        data: { secure_token: 'channel-test-token', expires_in: 60 },
      }),
    });
  });

  await page.goto('/verify');

  await expect(page.getByTestId('peer-vouch-count')).toHaveText('0 / 3');
  await expect(page.getByTestId('vouch-subtab-scan')).toBeDisabled();

  await expect.poll(() => Boolean(channelSocket)).toBe(true);

  const topic = `user_notifications:${USER_ID}`;

  // Regression guard: the old implementation polled /profiles/me every 10s.
  const requestsBeforeIdle = state.profileRequests;
  await page.waitForTimeout(12_000);
  expect(state.profileRequests).toBe(requestsBeforeIdle);

  // A verifier's vouch arrives as a push; the tally updates without reloading.
  state.profile = {
    ...state.profile,
    peer_vouches_received: 1,
    peer_verified: true,
    is_peer_verifier: false,
  };

  channelSocket.send(
    channelFrame(topic, 'peer_verification_updated', {
      reason: 'vouch',
      peer_vouches_received: 1,
      peer_verified: true,
      is_peer_verifier: false,
      vouch_credits_remaining: 0,
    }),
  );

  await expect(page.getByTestId('peer-vouch-count')).toHaveText('1 / 3');
  await expect(page.getByTestId('vouch-subtab-scan')).toBeDisabled();

  // The third vouch promotes the member and unlocks scanning immediately.
  state.profile = {
    ...state.profile,
    peer_vouches_received: 3,
    peer_verified: true,
    is_peer_verifier: true,
    vouch_credits_remaining: 5,
  };

  channelSocket.send(
    channelFrame(topic, 'peer_verification_updated', {
      reason: 'vouch',
      peer_vouches_received: 3,
      peer_verified: true,
      is_peer_verifier: true,
      vouch_credits_remaining: 5,
    }),
  );

  await expect(page.getByTestId('peer-vouch-count')).toHaveText('3 / 3');
  await expect(page.getByTestId('peer-verified-status')).toHaveText('Peer Verified');
  await expect(page.getByTestId('peer-verified-badge').first()).toBeVisible();
  await expect(page.getByTestId('vouch-credits')).toContainText('5 / 5 Credits Left');
  await expect(page.getByTestId('vouch-subtab-scan')).toBeEnabled();
});
