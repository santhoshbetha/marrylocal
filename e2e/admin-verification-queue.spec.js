import { test, expect } from '@playwright/test';

const ADMIN_A = {
  id: 9101,
  email: 'admin.santhosh@marrylocal.test',
  first_name: 'Santhosh',
  last_name: 'Admin',
  user_handle: 'admin_santhosh',
  role: 'admin',
  user_state: 'active',
  terms_accepted: true,
  email_verified: true,
  city: 'Delhi',
  state: 'Delhi',
  images: [],
  avatar_url: null,
};

const ADMIN_B = {
  id: 9102,
  email: 'admin.moderator@marrylocal.test',
  first_name: 'Moderator',
  last_name: 'Admin',
  user_handle: 'admin_moderator',
  role: 'admin',
  user_state: 'active',
  terms_accepted: true,
  email_verified: true,
  city: 'Delhi',
  state: 'Delhi',
  images: [],
  avatar_url: null,
};

const TOKEN_A = 'e2e-admin-queue-a';
const TOKEN_B = 'e2e-admin-queue-b';

function applicant(id, city, state, first, last) {
  return {
    id,
    first_name: first,
    last_name: last,
    age: 29,
    gender: 'Female',
    city,
    state,
    email: `${first.toLowerCase()}.${id}@marrylocal.test`,
    user_handle: `${first.toLowerCase()}_${id}`,
    user_state: 'active',
  };
}

function verification(id, user, adminId, submittedAt) {
  return {
    id,
    status: 'pending_admin_review',
    document_type: 'passport',
    preview_url: `https://r2.example.test/previews/${id}.jpg`,
    document_image_url: `https://r2.example.test/previews/${id}.jpg`,
    submitted_at: submittedAt,
    inserted_at: submittedAt,
    assigned_admin_id: adminId,
    user,
  };
}

function newState() {
  const now = Date.now();
  return {
    items: [
      verification(
        'verification-delhi-1',
        applicant(8101, 'Delhi', 'Delhi', 'Neha', 'Delhi'),
        ADMIN_A.id,
        new Date(now - 2 * 3600_000).toISOString(),
      ),
      verification(
        'verification-delhi-2',
        applicant(8102, 'Delhi', 'Delhi', 'Aarav', 'Delhi'),
        ADMIN_B.id,
        new Date(now - 3 * 3600_000).toISOString(),
      ),
      verification(
        'verification-blr-1',
        applicant(8103, 'Bangalore', 'Karnataka', 'Kavya', 'Bengaluru'),
        ADMIN_A.id,
        new Date(now - 4 * 3600_000).toISOString(),
      ),
      verification(
        'verification-blr-2',
        applicant(8104, 'Bangalore', 'Karnataka', 'Rohan', 'Bengaluru'),
        ADMIN_B.id,
        new Date(now - 5 * 3600_000).toISOString(),
      ),
    ],
    history: [],
  };
}

function adminForToken(token) {
  return token === TOKEN_A ? ADMIN_A : ADMIN_B;
}

async function seedSession(page, admin, token) {
  await page.addInitScript(
    ({ user, authToken }) => {
      window.localStorage.setItem('marrylocal.auth.token', authToken);
      window.localStorage.setItem('marrylocal.auth.user', JSON.stringify(user));
    },
    { user: admin, authToken: token },
  );
}

async function installMocks(page, state, token) {
  await page.route('**/api/v1/profiles/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { profile: adminForToken(token) },
      }),
    });
  });

  await page.route('**/api/v1/notifications**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          notifications: [],
          pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 },
          unread_count: 0,
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

  await page.route('**/api/v1/admin/verifications**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const admin = adminForToken(token);

    if (url.pathname.endsWith('/rebalance') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { reassigned: 0 } }),
      });
      return;
    }

    if (url.pathname.endsWith('/approve') || url.pathname.endsWith('/reject')) {
      const id = url.pathname.split('/').at(-2);
      const item = state.items.find(candidate => candidate.id === id);

      if (!item) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'error', message: 'Verification not found.' }),
        });
        return;
      }

      const isReject = url.pathname.endsWith('/reject');
      const payload = isReject ? request.postDataJSON() : {};
      const reviewedAt = new Date().toISOString();

      item.status = isReject ? 'rejected' : 'approved';
      state.history = [
        {
          id: item.id,
          status: item.status,
          document_type: item.document_type,
          submitted_at: item.submitted_at,
          reviewed_at: reviewedAt,
          reviewed_by_admin_id: admin.id,
          reviewed_by_admin_email: admin.email,
          rejection_reason: isReject ? payload.reason : null,
          admin_notes: null,
          user: item.user,
        },
        ...state.history,
      ];
      state.items = state.items.filter(candidate => candidate.id !== id);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { verification: state.history[0] },
        }),
      });
      return;
    }

    if (method !== 'GET') {
      await route.fulfill({
        status: 405,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'error', message: 'Not allowed' }),
      });
      return;
    }

    const view = url.searchParams.get('view') || 'my_queue';
    const stateFilter = url.searchParams.get('state');
    const cityFilter = url.searchParams.get('city');
    const page = Number(url.searchParams.get('page') || 1);
    const perPage = Number(url.searchParams.get('per_page') || 12);

    let items;

    if (view === 'history') {
      items = [...state.history];
    } else {
      items = state.items.filter(
        item => view === 'all_pending' || item.assigned_admin_id === admin.id,
      );
    }

    if (stateFilter && stateFilter !== 'All') {
      items = items.filter(item => item.user?.state === stateFilter);
    }
    if (cityFilter && cityFilter !== 'All Cities') {
      items = items.filter(item => item.user?.city === cityFilter);
    }

    const total = items.length;
    const paged = items.slice((page - 1) * perPage, page * perPage);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          items: paged,
          verifications: paged,
          meta: {
            page,
            per_page: perPage,
            total_count: total,
            total_pages: perPage > 0 ? Math.ceil(total / perPage) : 0,
          },
        },
      }),
    });
  });
}

test('admins get disjoint assigned queues, filters, inspection and history', async ({
  browser,
}) => {
  const state = newState();

  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await seedSession(pageA, ADMIN_A, TOKEN_A);
  await installMocks(pageA, state, TOKEN_A);

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await seedSession(pageB, ADMIN_B, TOKEN_B);
  await installMocks(pageB, state, TOKEN_B);

  await pageA.goto('/admin/verifications');
  await pageB.goto('/admin/verifications');

  await expect(pageA.getByTestId('admin-verification-row-verification-delhi-1')).toBeVisible();
  await expect(pageA.getByTestId('admin-verification-row-verification-blr-1')).toBeVisible();
  await expect(pageA.getByTestId('admin-verification-row-verification-delhi-2')).toHaveCount(0);
  await expect(pageA.getByTestId('admin-verification-row-verification-blr-2')).toHaveCount(0);

  await expect(pageB.getByTestId('admin-verification-row-verification-delhi-2')).toBeVisible();
  await expect(pageB.getByTestId('admin-verification-row-verification-blr-2')).toBeVisible();
  await expect(pageB.getByTestId('admin-verification-row-verification-delhi-1')).toHaveCount(0);
  await expect(pageB.getByTestId('admin-verification-row-verification-blr-1')).toHaveCount(0);

  await expect(pageA.getByTestId('pagination-summary')).toContainText('of 2 items');

  // State filter narrows Admin A's queue to Delhi.
  await pageA.getByTestId('verification-state-filter').click();
  await pageA.getByRole('option', { name: 'Delhi' }).click();

  await expect(pageA.getByTestId('admin-verification-row-verification-delhi-1')).toBeVisible();
  await expect(pageA.getByTestId('admin-verification-row-verification-blr-1')).toHaveCount(0);

  // Reset state and filter by Bangalore city.
  await pageA.getByTestId('verification-state-filter').click();
  await pageA.getByRole('option', { name: 'All states' }).click();
  await pageA.getByTestId('verification-city-filter').click();
  await pageA.getByRole('option', { name: 'Bangalore' }).click();

  await expect(pageA.getByTestId('admin-verification-row-verification-blr-1')).toBeVisible();
  await expect(pageA.getByTestId('admin-verification-row-verification-delhi-1')).toHaveCount(0);

  // Inspect the full document in the modal.
  await pageA.getByTestId('inspect-verification-verification-blr-1').click();

  const dialog = pageA.getByTestId('verification-inspect-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Kavya');
  await expect(dialog).toContainText('Bangalore, Karnataka');

  const fullImage = pageA.getByTestId('open-full-image');
  await expect(fullImage).toBeVisible();
  await expect(fullImage).toHaveAttribute(
    'href',
    'https://r2.example.test/previews/verification-blr-1.jpg',
  );

  // Reject the Bangalore item with a reason.
  await pageA.getByTestId('verification-reject-reason').fill('Document photo is blurred.');
  await pageA.getByTestId('reject-verification').click();

  await expect(dialog).toHaveCount(0);
  await expect(pageA.getByTestId('admin-verification-row-verification-blr-1')).toHaveCount(0);

  // Reset city filter, then approve the Delhi item.
  await pageA.getByTestId('verification-city-filter').click();
  await pageA.getByRole('option', { name: 'All cities' }).click();
  await pageA.getByTestId('inspect-verification-verification-delhi-1').click();
  await pageA.getByTestId('approve-verification').click();

  await expect(pageA.getByTestId('admin-verification-row-verification-delhi-1')).toHaveCount(0);
  await expect(pageA.getByTestId('pagination-summary')).toContainText('of 0 items');

  // Review History contains both decisions with reviewer details.
  await pageA.getByTestId('view-tab-history').click();

  const approvedRow = pageA.getByTestId('verification-history-row-verification-delhi-1');
  await expect(approvedRow).toContainText('Approved');
  await expect(approvedRow).toContainText('admin.santhosh@marrylocal.test');
  await expect(approvedRow).toContainText('Reviewed');

  const rejectedRow = pageA.getByTestId('verification-history-row-verification-blr-1');
  await expect(rejectedRow).toContainText('Rejected');
  await expect(rejectedRow).toContainText('Document photo is blurred.');

  await contextA.close();
  await contextB.close();
});
