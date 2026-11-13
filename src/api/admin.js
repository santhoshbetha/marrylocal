import { apiClient } from '@/api/client';

/**
 * Shared TanStack Query keys and typed helpers for the admin console.
 *
 * Every admin mutation invalidates `adminKeys.all`, which is the `['admin']`
 * prefix. That keeps the open admin screens in sync after an edit, a bulk
 * update, or a bulk email queue operation — including changes made elsewhere
 * and then refreshed from the dashboard.
 */
export const adminKeys = {
  all: ['admin'],
  users: filters => ['admin', 'users', filters ?? {}],
  userLookup: () => ['admin', 'user-lookup'],
  verifications: () => ['admin', 'verifications'],
  settings: () => ['admin', 'settings'],
};

const asArray = value => (Array.isArray(value) ? value : []);

/**
 * The API already returns snake_case, but older rows/clients occasionally
 * surface the legacy camelCase names. Normalising in one place keeps every
 * screen consistent and prevents `undefined` rendering.
 */
export function normalizeAdminUser(user) {
  if (!user) return null;

  return {
    ...user,
    id: user.id ?? user.userid ?? null,
    first_name: user.first_name ?? user.firstname ?? '',
    last_name: user.last_name ?? user.lastname ?? '',
    phone_number: user.phone_number ?? user.phonenumber ?? '',
    email_verified: Boolean(user.email_verified ?? user.emailverified),
    aadhaar_verified: Boolean(user.aadhaar_verified ?? user.aadhar_verified ?? user.aadharverified),
    passport_verified: Boolean(user.passport_verified ?? user.passportverified),
    license_verified: Boolean(user.license_verified ?? user.licenseverified),
    peer_verified: Boolean(user.peer_verified),
    peer_vouches_received: user.peer_vouches_received ?? 0,
    vouch_credits_remaining: user.vouch_credits_remaining ?? 0,
    terms_accepted: Boolean(user.terms_accepted ?? user.termsaccepted),
    one_time_fees_paid: Boolean(
      user.one_time_fees_paid ?? user.onetime_fees_paid ?? user.onetimefeespaid,
    ),
    one_time_fees_required: Boolean(
      user.one_time_fees_required ?? user.onetime_fees_required ?? user.onetimefeesrequired,
    ),
    accepted_one_time_fees_amount:
      user.accepted_one_time_fees_amount ?? user.acceptedonetimefeesamount ?? null,
    max_search_distance: user.max_search_distance ?? user.maxsearchdistance ?? null,
    is_beta_tester: Boolean(user.is_beta_tester),
    user_state: user.user_state ?? user.userstate ?? 'unknown',
  };
}

export async function fetchAdminUsers(filters = {}, { signal } = {}) {
  const query = filters?.query?.trim();
  const state = filters?.state;
  const city = filters?.city;

  const params = {};

  if (query) params.query = query;
  if (state && state !== 'All') params.state = state;
  if (city && city !== 'All' && city !== 'All Cities') params.city = city;

  const { data } = await apiClient.get('/api/v1/admin/users', { params, signal });

  return asArray(data?.data?.users).map(normalizeAdminUser);
}

export async function lookupAdminUser(query, { signal } = {}) {
  const { data } = await apiClient.get('/api/v1/admin/users/lookup', {
    params: { query },
    signal,
  });

  return normalizeAdminUser(data?.data?.user);
}

export async function updateAdminUser(id, updates, { signal } = {}) {
  const { data } = await apiClient.patch(`/api/v1/admin/users/${encodeURIComponent(id)}`, updates, {
    signal,
  });

  return normalizeAdminUser(data?.data?.user);
}

export async function bulkUpdateAdminUsers(userIds, updates, { signal } = {}) {
  const { data } = await apiClient.post(
    '/api/v1/admin/users/bulk-update',
    { user_ids: userIds, updates },
    { signal },
  );

  return data;
}

export async function queueAdminBulkEmail(payload, { signal } = {}) {
  const { data } = await apiClient.post('/api/v1/admin/emails/bulk-send', payload, { signal });

  return data;
}

export async function previewAdminEmailRecipients(params, { signal } = {}) {
  const { data } = await apiClient.get('/api/v1/admin/emails/preview-count', {
    params,
    signal,
  });

  return Number(data?.recipient_count ?? 0);
}

export async function queueSystemNotification(payload, { signal } = {}) {
  const { data } = await apiClient.post('/api/v1/admin/notifications/broadcast', payload, {
    signal,
  });

  return data;
}

export async function fetchAdminSettings({ signal } = {}) {
  const { data } = await apiClient.get('/api/v1/admin/settings', { signal });
  return data?.data?.settings ?? {};
}

export async function fetchAdminVerifications({ signal } = {}) {
  const { data } = await apiClient.get('/api/v1/admin/verifications', { signal });
  return data?.data?.verifications ?? [];
}

export async function approveAdminVerification(id, { signal } = {}) {
  const { data } = await apiClient.post(
    `/api/v1/admin/verifications/${encodeURIComponent(id)}/approve`,
    {},
    { signal },
  );
  return data?.data?.verification ?? data?.data;
}

export async function rejectAdminVerification(id, reason, { signal } = {}) {
  const { data } = await apiClient.post(
    `/api/v1/admin/verifications/${encodeURIComponent(id)}/reject`,
    { reason },
    { signal },
  );
  return data?.data?.verification ?? data?.data;
}

export async function updateAdminSettings(settings, { signal } = {}) {
  const { data } = await apiClient.patch('/api/v1/admin/settings', settings, { signal });
  return data?.data?.settings ?? {};
}
