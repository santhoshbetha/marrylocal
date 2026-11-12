import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'];

function unwrap(payload) {
  return payload?.data ?? payload ?? {};
}

function normalizeNotificationPage(payload, fallbackPage, fallbackPerPage) {
  const data = unwrap(payload);

  return {
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    pagination: data.pagination ?? {
      page: fallbackPage,
      per_page: fallbackPerPage,
      total: 0,
      total_pages: 0,
    },
    unreadCount: Number(data.unread_count ?? 0),
  };
}

export function useNotifications(page = 1, perPage = 20) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, 'list', { page, perPage }],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get('/api/v1/notifications', {
        params: { page, per_page: perPage },
        signal,
      });

      return normalizeNotificationPage(response.data, page, perPage);
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useUnreadNotifications(enabled = true) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, 'unread'],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get('/api/v1/notifications', {
        params: { page: 1, per_page: 1 },
        signal,
      });

      return Number(unwrap(response.data).unread_count ?? 0);
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async notificationId =>
      apiClient.patch(`/api/v1/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => apiClient.post('/api/v1/notifications/mark-all-read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}
