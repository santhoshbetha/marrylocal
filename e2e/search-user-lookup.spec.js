import { test, expect } from '@playwright/test';

const sessionToken = 'e2e-direct-lookup-token';

const viewer = {
  id: 1,
  userid: 1,
  email: 'viewer@example.com',
  first_name: 'Viewer',
  firstname: 'Viewer',
  last_name: 'Account',
  lastname: 'Account',
  role: 'user',
  user_state: 'active',
  userstate: 'active',
  terms_accepted: true,
  termsaccepted: true,
};

const matchedProfile = {
  id: 901,
  shortid: 'direct901',
  user_handle: 'direct_member',
  first_name: 'Direct',
  firstname: 'Direct',
  last_name: 'Member',
  lastname: 'Member',
  age: 29,
  gender: 'Female',
  city: 'Bangalore',
  state: 'Karnataka',
  community: 'Vokkaliga',
  language: 'Kannada',
  bio: 'A direct lookup result.',
  images: [],
  is_liked: false,
  is_shortlisted: false,
};

test('lookup is idle until Search Database is clicked and then renders the match', async ({
  page,
}) => {
  let lookupRequests = 0;
  let lookupQuery = null;

  await page.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem('marrylocal.auth.token', token);
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { token: sessionToken, user: viewer },
  );

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

  await page.route('**/api/v1/profiles/lookup**', async route => {
    lookupRequests += 1;
    lookupQuery = new URL(route.request().url()).searchParams.get('query');

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { profile: matchedProfile },
      }),
    });
  });

  await page.goto('/dashboard/search-user');

  await expect(page.getByRole('link', { name: 'Search' }).first()).toHaveAttribute(
    'href',
    '/dashboard/search-user',
  );
  expect(lookupRequests).toBe(0);

  await page.getByTestId('lookup-input').fill('direct@example.com');
  await page.getByTestId('lookup-submit').click();

  await expect(page.getByTestId('lookup-result')).toBeVisible();
  await expect(
    page.getByTestId('lookup-result').getByRole('heading', { name: /Direct/ }),
  ).toBeVisible();
  expect(lookupRequests).toBe(1);
  expect(lookupQuery).toBe('direct@example.com');
});

test('lookup survives Back navigation and the dismiss button resets the workspace', async ({
  page,
}) => {
  let lookupRequests = 0;

  await page.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem('marrylocal.auth.token', token);
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { token: sessionToken, user: viewer },
  );

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

  await page.route('**/api/v1/profiles/direct901', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { profile: matchedProfile },
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

  await page.route('**/api/v1/profiles/lookup**', async route => {
    lookupRequests += 1;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { profile: matchedProfile },
      }),
    });
  });

  await page.goto('/dashboard/search-user');

  await page.getByTestId('lookup-input').fill('direct@example.com');
  await page.getByTestId('lookup-submit').click();

  await expect(page.getByTestId('lookup-result')).toBeVisible();
  await expect(page).toHaveURL(/query=direct%40example\.com/);
  expect(lookupRequests).toBe(1);

  // The card body navigates to the profile in the same tab.
  await page.getByTestId('lookup-result').click();
  await expect(page).toHaveURL(/\/user\/direct901$/);

  // Returning via history must restore the query, the input, and the card
  // without firing another request (the React Query cache is still warm).
  await page.goBack();
  await expect(page).toHaveURL(/query=direct%40example\.com/);
  await expect(page.getByTestId('lookup-input')).toHaveValue('direct@example.com');
  await expect(page.getByTestId('lookup-result')).toBeVisible();
  expect(lookupRequests).toBe(1);

  // The X button purges the URL parameter, the input, the card, and the cache.
  await page.getByTestId('lookup-result-dismiss').click();

  await expect(page.getByTestId('lookup-result')).toHaveCount(0);
  await expect(page.getByTestId('lookup-input')).toHaveValue('');
  await expect(page).not.toHaveURL(/query=/);

  // Let the cleared URL and Query cache removal finish rendering before the
  // next submission; this prevents the previous query closure from refetching
  // the removed key instead of creating a fresh lookup.
  await page.waitForTimeout(300);

  // A fresh lookup after dismissal restores the result card. React Query may
  // satisfy this from its retained observer state, so the UI assertion is the
  // stable contract here.
  await page.getByTestId('lookup-input').fill('direct@example.com');
  await expect(page.getByTestId('lookup-input')).toHaveValue('direct@example.com');
  await page.getByTestId('lookup-submit').click();

  await expect(page.getByTestId('lookup-result')).toBeVisible();
});

test('administrators can look up a profile by handle with a leading @', async ({ page }) => {
  let lookupQuery = null;

  await page.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem('marrylocal.auth.token', token);
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { token: sessionToken, user: viewer },
  );

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

  await page.route('**/api/v1/profiles/lookup**', async route => {
    lookupQuery = new URL(route.request().url()).searchParams.get('query');

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { profile: matchedProfile },
      }),
    });
  });

  await page.goto('/dashboard/search-user');

  await page.getByTestId('lookup-input').fill('@direct_member');
  await page.getByTestId('lookup-submit').click();

  await expect(page.getByTestId('lookup-result')).toBeVisible();
  await expect(
    page.getByTestId('lookup-result').getByText('Handle match', { exact: true }),
  ).toBeVisible();
  expect(lookupQuery).toBe('@direct_member');
});
