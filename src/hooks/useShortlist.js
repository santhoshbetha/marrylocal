import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { PROFILE_ME_KEY } from '@/hooks/useProfile';

export const SHORTLIST_QUERY_KEY = ['profiles', 'shortlist'];
export const SHORTLIST_PAGE_SIZE = 20;

function toLegacyProfile(profile) {
  return {
    ...profile,
    userid: profile.id,
    firstname: profile.first_name,
    lastname: profile.last_name,
    educationlevel: profile.education_level,
    economicstatus: profile.economic_status,
    jobstatus: profile.job_status,
    distance: profile.distance_km ?? profile.distance_meters,
  };
}

async function resolveTargetId(shortid) {
  if (shortid === null || shortid === undefined || shortid === '') {
    throw new Error('A profile identifier is required.');
  }

  if (/^\d+$/.test(String(shortid))) return Number(shortid);

  const response = await apiClient.get('/api/v1/search/users', {
    params: { q: shortid, per_page: 1 },
  });

  const users = response.data?.data?.users || response.data?.users || [];
  if (!users.length) throw new Error('Profile not found.');

  return users[0].id;
}

export function useShortlistData() {
  return useInfiniteQuery({
    queryKey: SHORTLIST_QUERY_KEY,
    queryFn: async ({ pageParam = 1, signal }) => {
      const response = await apiClient.get('/api/v1/relationships/shortlisted', {
        params: { page: pageParam, per_page: SHORTLIST_PAGE_SIZE },
        signal,
      });

      const data = response.data?.data || {};
      const users = data.users || [];

      return {
        users: users.map(toLegacyProfile),
        pagination: data.pagination || {},
      };
    },
    initialPageParam: 1,
    getNextPageParam: lastPage =>
      lastPage?.pagination?.has_next_page ? lastPage.pagination.page + 1 : undefined,
    staleTime: 15_000,
  });
}

export function flattenShortlistPages(data) {
  return data?.pages?.flatMap(page => page.users ?? []) ?? [];
}

export function useAddToShortlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shortid }) => {
      const targetId = await resolveTargetId(shortid);

      const response = await apiClient.post('/api/v1/relationships', {
        kind: 'shortlist',
        target_id: targetId,
      });

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: PROFILE_ME_KEY });
    },
  });
}

export function useRemoveFromShortlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shortidtoremove }) => {
      const targetId = await resolveTargetId(shortidtoremove);

      const response = await apiClient.delete(`/api/v1/relationships/shortlist/${targetId}`);

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: PROFILE_ME_KEY });
    },
  });
}

export function useGetUserProfile({ shortid } = {}) {
  return useQuery({
    queryKey: ['profiles', 'user', shortid],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/search/users', {
        params: { q: shortid, per_page: 1 },
      });

      const users = response.data?.data?.users || response.data?.users || [];
      return users.length ? toLegacyProfile(users[0]) : null;
    },
    enabled: Boolean(shortid),
    staleTime: 15_000,
  });
}

export default useShortlistData;
