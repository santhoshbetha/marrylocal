import { test, expect } from '@playwright/test';

const SESSION_TOKEN = 'e2e-report-kyc-token';

const viewer = {
  id: 7001,
  email: 'viewer.report@marrylocal.test',
  first_name: 'Viewer',
  last_name: 'Report',
  user_handle: 'viewer_report',
  shortid: 'viewer7001',
  role: 'user',
  user_state: 'active',
  terms_accepted: true,
  email_verified: true,
  city: 'Delhi',
  state: 'Delhi',
  images: [],
  avatar_url: null,
};

const reportedUser = {
  id: 8001,
  email: 'reported.member@marrylocal.test',
  first_name: 'Reported',
  last_name: 'Member',
  user_handle: 'reported_member',
  shortid: 'reported8001',
  age: 30,
  gender: 'Male',
  city: 'Delhi',
  state: 'Delhi',
  role: 'user',
  user_state: 'active',
  images: [],
  avatar_url: null,
  bio: 'Test profile',
};

async function seedSession(page, user = viewer, token = SESSION_TOKEN) {
  await page.addInitScript(
    ({ authToken, sessionUser }) => {
      window.localStorage.setItem('marrylocal.auth.token', authToken);
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(sessionUser));
    },
    { authToken: token, sessionUser: user },
  );
}

async function mockShell(page, { notifications = [] } = {}) {
  await page.route('**/api/v1/profiles/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { profile: viewer } }),
    });
  });

  await page.route('**/api/v1/notifications**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          notifications,
          pagination: { page: 1, per_page: 20, total: notifications.length, total_pages: 1 },
          unread_count: notifications.filter(item => !item.is_read).length,
        },
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
}

test('flag opens the in-app report modal, submits once, and blocks duplicates', async ({
  page,
}) => {
  const reports = [];

  await seedSession(page);
  await mockShell(page);

  await page.route('**/api/v1/profiles/8001', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { profile: reportedUser } }),
    });
  });

  await page.route('**/api/v1/reports', async route => {
    const payload = route.request().postDataJSON() || {};
    reports.push(payload);

    if (reports.length > 1) {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          code: 'duplicate_pending_report',
          message:
            'You already have an open report against this member. Our safety team is reviewing it.',
        }),
      });
      return;
    }

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        message: 'Thank you. Your report has been submitted to our safety team.',
        data: {
          report: {
            id: 501,
            reported_user_id: reportedUser.id,
            reason: payload.reason,
            status: 'pending',
          },
        },
      }),
    });
  });

  await page.goto('/user/8001');

  await expect(page.getByRole('button', { name: 'Report profile' })).toBeVisible();
  await page.getByRole('button', { name: 'Report profile' }).click();

  const dialog = page.getByTestId('report-user-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Report Reported Member');
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);

  await page.getByTestId('report-reason-harassment').check();
  await page.getByTestId('report-details').fill('Sent repeated abusive messages.');
  await page.getByTestId('report-submit').click();

  await expect(
    page.getByText('Thank you. Your report has been submitted to our safety team.'),
  ).toBeVisible();
  await expect(dialog).toHaveCount(0);

  expect(reports[0]).toEqual({
    reported_user_id: reportedUser.id,
    reason: 'harassment',
    details: 'Sent repeated abusive messages.',
  });

  await page.getByRole('button', { name: 'Report profile' }).click();
  await expect(page.getByTestId('report-user-dialog')).toBeVisible();
  await page.getByTestId('report-submit').click();

  await expect(
    page.getByText('You already have an open report against this member', { exact: false }),
  ).toBeVisible();
});

test('admin KYC decisions deliver an in-app notification with audit timestamps', async ({
  page,
}) => {
  const notifications = [];

  await seedSession(page);
  await mockShell(page, { notifications });

  await page.route('**/api/v1/admin/verifications/**/approve', async route => {
    const reviewedAt = new Date().toISOString();

    notifications.unshift({
      id: 9901,
      type: 'verification_update',
      title: 'Identity Verification Approved',
      body: `Your Passport verification has been approved on 14 November 2026. Your ID Verified badge is now active!`,
      is_read: false,
      read_at: null,
      metadata: { decision: 'approved' },
      inserted_at: reviewedAt,
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          verification: {
            id: 'verification-approved',
            status: 'verified',
            decision: 'approved',
            reviewed_at: reviewedAt,
            reviewed_by_admin_id: 1,
          },
        },
      }),
    });
  });

  await page.route('**/api/v1/admin/verifications/**/reject', async route => {
    const reviewedAt = new Date().toISOString();
    const payload = route.request().postDataJSON() || {};

    notifications.unshift({
      id: 9902,
      type: 'verification_update',
      title: 'Identity Verification Update',
      body: `Your Passport submission could not be verified. Reason: ${payload.reason}. Please review and submit a clearer document.`,
      is_read: false,
      read_at: null,
      metadata: { decision: 'rejected' },
      inserted_at: reviewedAt,
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          verification: {
            id: 'verification-rejected',
            status: 'rejected',
            decision: 'rejected',
            rejection_reason: payload.reason,
            reviewed_at: reviewedAt,
            reviewed_by_admin_id: 1,
          },
        },
      }),
    });
  });

  await page.goto('/notifications');

  const approved = await page.evaluate(async () => {
    const response = await fetch('/api/v1/admin/verifications/verification-approved/approve', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer e2e-admin-token',
      },
      body: JSON.stringify({}),
    });

    return { status: response.status, body: await response.json() };
  });

  expect(approved.status).toBe(200);
  expect(approved.body.data.verification.decision).toBe('approved');
  expect(approved.body.data.verification.reviewed_at).toBeTruthy();

  const rejected = await page.evaluate(async () => {
    const response = await fetch('/api/v1/admin/verifications/verification-rejected/reject', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer e2e-admin-token',
      },
      body: JSON.stringify({ reason: 'The document number is unreadable.' }),
    });

    return { status: response.status, body: await response.json() };
  });

  expect(rejected.status).toBe(200);
  expect(rejected.body.data.verification.decision).toBe('rejected');
  expect(rejected.body.data.verification.rejection_reason).toBe(
    'The document number is unreadable.',
  );

  await page.reload();

  await expect(page.getByTestId('notification-9902')).toContainText('Identity Verification Update');
  await expect(page.getByTestId('notification-9902')).toContainText(
    'The document number is unreadable.',
  );
  await expect(page.getByTestId('notification-9901')).toContainText(
    'Identity Verification Approved',
  );
  await expect(page.getByTestId('notification-9901')).toContainText('ID Verified badge');
});
