import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export const DISCOVERY_PAGE_SIZE = 15;
export const DISCOVERY_QUERY_KEY = ['profiles', 'discovery'];

function normalizeProfile(profile) {
  return {
    ...profile,
    distance_meters:
      typeof profile.distance_meters === 'number'
        ? profile.distance_meters
        : typeof profile.distance_km === 'number'
          ? profile.distance_km * 1000
          : null,
  };
}

function buildParams(filters, page) {
  const params = { page, per_page: DISCOVERY_PAGE_SIZE };

  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      params[key] = value;
    }
  });

  return params;
}

async function fetchDiscoveryPage({ pageParam = 1, filters, signal }) {
  const response = await api.get('/api/v1/profiles/discovery', {
    params: buildParams(filters, pageParam),
    signal,
  });

  const data = response.data?.data || { profiles: [], pagination: {} };

  return {
    ...data,
    profiles: (data.profiles || []).map(normalizeProfile),
  };
}

/**
 * Central discovery query manifest.
 *
 * Filters are query keys, not context state. Changing a filter creates a new
 * cache entry; returning to an old filter set restores its pages instantly.
 */
export function useProfileDiscovery(filters = {}, options = {}) {
  return useInfiniteQuery({
    queryKey: [...DISCOVERY_QUERY_KEY, filters],
    queryFn: ({ pageParam, signal }) => fetchDiscoveryPage({ pageParam, filters, signal }),
    initialPageParam: 1,
    getNextPageParam: lastPage =>
      lastPage?.pagination?.has_next_page ? lastPage.pagination.page + 1 : undefined,
    staleTime: 15_000,
    retry: (failureCount, error) => error?.status !== 429 && failureCount < 2,
    enabled: options.enabled ?? true,
  });
}

/**
 * Relationship mutation for like/dislike/shortlist.
 *
 * The mutation owns cache reconciliation so every card interaction uses the
 * same invalidation contract.
 */
export function useProfileInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ kind, targetId }) => {
      const response = await api.post('/api/v1/relationships', {
        kind,
        target_id: targetId,
      });

      return response.data;
    },
    onMutate: async ({ kind, targetId }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['profiles'] }),
        queryClient.cancelQueries({ queryKey: ['profile'] }),
      ]);

      const previous = [
        ...queryClient.getQueriesData({ queryKey: ['profiles'] }),
        ...queryClient.getQueriesData({ queryKey: ['profile'] }),
      ];

      queryClient.setQueriesData({ queryKey: ['profiles'] }, oldData =>
        applyRelationshipFlag(oldData, targetId, kind),
      );
      queryClient.setQueriesData({ queryKey: ['profile'] }, oldData =>
        applyRelationshipFlag(oldData, targetId, kind),
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      for (const [queryKey, data] of context?.previous ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
    },
    onSuccess: () => {
      // Mark all profile tracks stale without forcing the active discovery page
      // to refetch immediately. The optimistic cache update keeps the button
      // locked; a later tab switch or explicit refetch reconciles with the API.
      queryClient.invalidateQueries({
        queryKey: ['profiles', 'discovery'],
        refetchType: 'none',
      });
      queryClient.invalidateQueries({
        queryKey: ['profile'],
        refetchType: 'none',
      });
      queryClient.invalidateQueries({
        queryKey: ['profiles', 'shortlist'],
        refetchType: 'none',
      });
      queryClient.invalidateQueries({
        queryKey: ['profiles', 'liked-me'],
        refetchType: 'none',
      });
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

function applyRelationshipFlag(data, targetId, kind) {
  if (!data) return data;

  const applyToProfile = profile => {
    if (Number(profile?.id) !== Number(targetId)) return profile;

    if (kind === 'like') return { ...profile, is_liked: true };
    if (kind === 'shortlist') return { ...profile, is_shortlisted: true };
    if (kind === 'dislike') return { ...profile, is_disliked: true };
    return profile;
  };

  if (Array.isArray(data.pages)) {
    return {
      ...data,
      pages: data.pages.map(page => ({
        ...page,
        profiles: Array.isArray(page.profiles) ? page.profiles.map(applyToProfile) : page.profiles,
        users: Array.isArray(page.users) ? page.users.map(applyToProfile) : page.users,
      })),
    };
  }

  if (data.profile) {
    return { ...data, profile: applyToProfile(data.profile) };
  }

  if (data.data?.profile) {
    return {
      ...data,
      data: {
        ...data.data,
        profile: applyToProfile(data.data.profile),
      },
    };
  }

  if (data.id) return applyToProfile(data);

  return data;
}

export function flattenDiscoveryPages(data) {
  return data?.pages?.flatMap(page => page.profiles ?? []) ?? [];
}

/**
 * Block/mute mutation used by the profile moderation menu.
 *
 * Unlike like/shortlist, moderation must remove the target from every active
 * feed immediately, so it invalidates the full profile cache tree.
 */
export function useModerationAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ kind, targetId }) => {
      const response = await api.post('/api/v1/relationships', {
        kind,
        target_id: targetId,
      });

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function discoveryTotal(data) {
  return data?.pages?.[0]?.pagination?.total ?? 0;
}

export default useProfileDiscovery;
