import { test, expect } from '@playwright/test';

const viewer = {
  id: 504,
  email: 'settings.job@marrylocal.test',
  first_name: 'Settings',
  last_name: 'Jobs',
  user_handle: 'settings_jobs',
  shortid: 'jobs504',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
  gender: 'Female',
  city: 'Bangalore',
  state: 'Karnataka',
  images: [],
  avatar_url: null,
  job_status: false,
};

test('updates job status from Settings and supports later changes', async ({ page }) => {
  let employed = false;
  const patchPayloads = [];

  await page.addInitScript(
    ({ user }) => {
      window.localStorage.setItem('marrylocal.auth.token', 'e2e-settings-job-token');
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { user: viewer },
  );

  await page.route('**/api/v1/profiles/me', async route => {
    if (route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON();
      patchPayloads.push(payload);

      if (typeof payload.job_status === 'boolean') {
        employed = payload.job_status;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { profile: { ...viewer, job_status: employed } },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { profile: { ...viewer, job_status: employed, max_search_distance: 100 } },
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

  await page.goto('/settings');

  await expect(page.getByText('Profile details', { exact: true })).toBeVisible();

  const jobToggle = page.getByTestId('settings-job-status');
  await expect(jobToggle).toHaveAttribute('aria-checked', 'false');

  await jobToggle.click();

  await expect.poll(() => patchPayloads.length).toBe(1);
  expect(patchPayloads[0]).toEqual({ job_status: true });
  await expect(jobToggle).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('Currently employed — this is shown on your profile.')).toBeVisible();

  // Change it again later without leaving Settings.
  await jobToggle.click();

  await expect.poll(() => patchPayloads.length).toBe(2);
  expect(patchPayloads[1]).toEqual({ job_status: false });
  await expect(jobToggle).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByText('Not currently employed — update this anytime.')).toBeVisible();
});
