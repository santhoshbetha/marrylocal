import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { acquireSocket, subscribeToTopic } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';

const topicSubscriptions = new Map();

/**
 * Shares one Phoenix channel handler per topic. Sidebar, dashboard shell, and
 * the notifications page can all subscribe without invalidating the cache
 * multiple times for the same push.
 */
function acquireNotificationTopic(topic, queryClient) {
  let entry = topicSubscriptions.get(topic);

  if (!entry) {
    const unsubscribe = subscribeToTopic(topic, (payload, eventName) => {
      if (eventName !== 'new_notification' && eventName !== 'notification') return;

      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });

      if (payload?.notification) {
        queryClient.setQueryData(['notifications', 'last-push'], payload.notification);
      }
    });

    entry = { count: 0, unsubscribe };
    topicSubscriptions.set(topic, entry);
  }

  entry.count += 1;
  let released = false;

  return () => {
    if (released) return;
    released = true;

    const current = topicSubscriptions.get(topic);
    if (!current) return;

    current.count -= 1;
    if (current.count <= 0) {
      current.unsubscribe();
      topicSubscriptions.delete(topic);
    }
  };
}

/**
 * Persistent dashboard notification channel.
 *
 * Joins `user_notifications:<current_user_id>` with the opaque bearer token and
 * invalidates the notification cache the instant a `new_notification` push
 * arrives. The socket is a native WebSocket speaking the Phoenix channel wire
 * protocol, so no Supabase realtime client or Phoenix npm package is required.
 */
export function useNotificationChannel({ token, userId, enabled = true } = {}) {
  const queryClient = useQueryClient();
  const storeToken = useAuthStore(state => state.token);
  const storeUser = useAuthStore(state => state.currentUser);

  const activeToken = token ?? storeToken;
  const activeUserId = userId ?? storeUser?.id;

  useEffect(() => {
    if (!enabled || !activeToken || !activeUserId) return undefined;

    acquireSocket(activeToken);

    const topic = `user_notifications:${activeUserId}`;
    const unsubscribe = acquireNotificationTopic(topic, queryClient);

    return unsubscribe;
  }, [activeToken, activeUserId, enabled, queryClient]);

  return { topic: activeUserId ? `user_notifications:${activeUserId}` : null };
}

export default useNotificationChannel;
