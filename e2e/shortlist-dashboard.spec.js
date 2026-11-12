import { test, expect } from '@playwright/test';

const sessionToken = 'e2e-shortlist-bearer-token';

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

function profile(id, firstName, overrides = {}) {
  return {
    id,
    shortid: `profile${id}`,
    user_handle: `${firstName.toLowerCase()}_${id}`,
    first_name: firstName,
    firstname: firstName,
    last_name: 'Member',
    lastname: 'Member',
    age: 27,
    gender: 'Female',
    city: 'Bangalore',
    state: 'Karnataka',
    community: 'Vokkaliga',
    language: 'Kannada',
    bio: 'A local member interested in a meaningful match.',
    images: [],
    is_liked: false,
    is_shortlisted: false,
    ...overrides,
  };
}

async function seedSession(page) {
  await page.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem('marrylocal.auth.token', token);
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { token: sessionToken, user: viewer },
  );
}

async function mockViewerBootstrap(page) {
  await page.route('**/api/v1/profiles/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          profile: {
            ...viewer,
            terms_accepted: true,
            termsaccepted: true,
            max_search_distance: 100,
          },
        },
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
}

test.describe('shortlist and likes dashboard', () => {
  test('switches tabs, renders flags, and loads another shortlist page', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    const savedOne = profile(201, 'Ananya', { is_shortlisted: true });
    const savedTwo = profile(202, 'Kavya', { is_shortlisted: true });
    const savedThree = profile(203, 'Meera', { is_shortlisted: true });
    const admirer = profile(301, 'Priya', { is_liked: false });

    await seedSession(page);
    await mockViewerBootstrap(page);

    await page.route('**/api/v1/relationships/shortlisted**', async route => {
      const pageNumber = Number(new URL(route.request().url()).searchParams.get('page') || 1);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            kind: 'shortlisted',
            users: pageNumber === 1 ? [savedOne, savedTwo] : [savedThree],
            pagination: {
              page: pageNumber,
              per_page: 20,
              total: 3,
              total_pages: 2,
              has_next_page: pageNumber === 1,
            },
          },
        }),
      });
    });

    await page.route('**/api/v1/relationships/liked-me**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            kind: 'liked_me',
            users: [admirer],
            pagination: {
              page: 1,
              per_page: 20,
              total: 1,
              total_pages: 1,
              has_next_page: false,
            },
          },
        }),
      });
    });

    await page.goto('/dashboard/shortlist');

    await expect(page.getByRole('link', { name: 'Shortlist' }).first()).toHaveAttribute(
      'href',
      '/dashboard/shortlist',
    );
    await expect(page.getByTestId('shortlist-grid')).toBeVisible();
    await expect(page.getByTestId('profile-card')).toHaveCount(2);
    await expect(page.getByTestId('shortlist-button').first()).toHaveText('Shortlisted');
    await expect(page.getByTestId('shortlist-button').first()).toBeDisabled();

    await page.getByTestId('load-more-profiles').click();
    await expect(page.getByTestId('profile-card')).toHaveCount(3);
    await expect(page.getByTestId('load-more-profiles')).toHaveCount(0);

    await page.getByTestId('liked-me-tab').click();
    await expect(page.getByTestId('liked-me-grid')).toBeVisible();
    await expect(page.getByTestId('profile-card')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: /Priya/ })).toBeVisible();

    await page.getByTestId('profile-card').first().click();
    await page.waitForURL('**/user/profile301');
    expect(new URL(page.url()).pathname).toBe('/user/profile301');

    expect(pageErrors).toEqual([]);
  });

  test('opens discovery cards in a new tab', async ({ page }) => {
    const candidate = profile(501, 'Aditi');

    await seedSession(page);
    await mockViewerBootstrap(page);

    await page.route('**/api/v1/profiles/discovery**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            profiles: [candidate],
            pagination: {
              page: 1,
              per_page: 20,
              total: 1,
              total_pages: 1,
              has_next_page: false,
            },
            locale: { radius_km: 100, latitude: 12.9716, longitude: 77.5946 },
          },
        }),
      });
    });

    await page.goto('/dashboard/search');
    await expect(page.getByTestId('profile-card')).toBeVisible();

    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByTestId('profile-card').click(),
    ]);

    await popup.waitForURL('**/user/profile501?newTab=true');
    expect(new URL(popup.url()).pathname).toBe('/user/profile501');
    expect(new URL(popup.url()).searchParams.get('newTab')).toBe('true');
    expect(new URL(page.url()).pathname).toBe('/dashboard/search');
  });

  test('locks Like into a muted reactive state after a successful mutation', async ({ page }) => {
    const candidate = profile(401, 'Sneha');
    let likePayload = null;

    await seedSession(page);
    await mockViewerBootstrap(page);

    await page.route('**/api/v1/relationships/shortlisted**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            kind: 'shortlisted',
            users: [candidate],
            pagination: {
              page: 1,
              per_page: 20,
              total: 1,
              total_pages: 1,
              has_next_page: false,
            },
          },
        }),
      });
    });

    await page.route('**/api/v1/relationships', async route => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }

      likePayload = route.request().postDataJSON();

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { is_match: false, inserted: true, relationship: { kind: 'like' } },
        }),
      });
    });

    await page.goto('/dashboard/shortlist');
    await expect(page.getByTestId('like-button')).toBeEnabled();
    await page.getByTestId('like-button').click();

    await expect(page.getByTestId('like-button')).toHaveText('Liked');
    await expect(page.getByTestId('like-button')).toBeDisabled();
    await expect(page.getByTestId('like-button')).toHaveClass(/bg-muted/);
    await expect(page.getByTestId('like-button')).toHaveClass(/text-muted-foreground/);

    expect(likePayload).toEqual({ kind: 'like', target_id: candidate.id });
  });

  test('renders the enhanced profile information clusters', async ({ page }) => {
    const candidate = profile(701, 'Ritika', {
      user_handle: 'ritika_701',
      religion: 'Hindu',
      caste: 'Smartha',
      education_level: 'Masters level',
      economic_status: 'Middleclass',
      job_status: true,
      verified: true,
      is_online: true,
      last_login_at: new Date().toISOString(),
    });

    await seedSession(page);
    await mockViewerBootstrap(page);

    await page.route('**/api/v1/profiles/701', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { profile: candidate } }),
      });
    });

    await page.goto('/user/701');

    await expect(page.getByRole('heading', { name: 'Personal Metrics' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cultural Alignment' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Social Verifications' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: /Ritika/ })).toBeVisible();
    await expect(page.getByText(/Online Now/i).first()).toBeVisible();
  });

  test('dispatches block and mute moderation actions from the profile menu', async ({ page }) => {
    const candidate = profile(801, 'Nisha', { user_handle: 'nisha_801' });
    let moderationPayload = null;

    await seedSession(page);
    await mockViewerBootstrap(page);

    await page.route('**/api/v1/profiles/801', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { profile: candidate } }),
      });
    });

    await page.route('**/api/v1/profiles/discovery**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            profiles: [],
            pagination: {
              page: 1,
              per_page: 20,
              total: 0,
              total_pages: 0,
              has_next_page: false,
            },
            locale: { radius_km: 100, latitude: 12.9716, longitude: 77.5946 },
          },
        }),
      });
    });

    await page.route('**/api/v1/relationships', async route => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }

      moderationPayload = route.request().postDataJSON();

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { is_match: false, inserted: true, relationship: { kind: 'block' } },
        }),
      });
    });

    await page.goto('/user/801');
    await page.getByRole('button', { name: 'Moderation actions' }).click();
    await expect(page.getByRole('menuitem', { name: 'Mute User Interactions' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Block Profile Regionally' }).click();

    await page.waitForURL('**/dashboard/search');
    expect(moderationPayload).toEqual({ kind: 'block', target_id: candidate.id });
  });

  test('removes a shortlisted profile through DELETE and refreshes both feeds', async ({
    page,
  }) => {
    const saved = profile(601, 'Riya', { is_shortlisted: true });
    let deleteUrl = null;
    let shortlistFetches = 0;

    await seedSession(page);
    await mockViewerBootstrap(page);

    await page.route('**/api/v1/relationships/shortlisted**', async route => {
      shortlistFetches += 1;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            kind: 'shortlisted',
            users: deleteUrl ? [] : [saved],
            pagination: {
              page: 1,
              per_page: 20,
              total: deleteUrl ? 0 : 1,
              total_pages: deleteUrl ? 0 : 1,
              has_next_page: false,
            },
          },
        }),
      });
    });

    await page.route('**/api/v1/relationships/shortlist/**', async route => {
      if (route.request().method() !== 'DELETE') {
        await route.fallback();
        return;
      }

      deleteUrl = route.request().url();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { relationships: {} } }),
      });
    });

    await page.route('**/api/v1/profiles/discovery**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            profiles: [{ ...saved, is_shortlisted: false }],
            pagination: {
              page: 1,
              per_page: 20,
              total: 1,
              total_pages: 1,
              has_next_page: false,
            },
            locale: { radius_km: 100, latitude: 12.9716, longitude: 77.5946 },
          },
        }),
      });
    });

    await page.goto('/dashboard/shortlist');

    await expect(page.getByTestId('profile-card')).toHaveCount(1);

    await page.getByRole('button', { name: 'Remove from shortlist' }).click();

    await expect.poll(() => deleteUrl).toContain('/api/v1/relationships/shortlist/601');
    await expect(page.getByText('No shortlisted profiles yet')).toBeVisible();
    expect(shortlistFetches).toBeGreaterThan(1);
  });
});
