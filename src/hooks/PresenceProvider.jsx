import { useEffect, useMemo, useState } from 'react';
import { acquireSocket, subscribeToTopic } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { EMPTY_PRESENCE, PresenceContext } from '@/hooks/presenceContext';

function parseUserKey(key) {
  const parsed = Number(String(key).replace(/^user:/, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function stateToPresence(state) {
  const ids = new Set();
  const meta = {};

  Object.entries(state || {}).forEach(([key, value]) => {
    const userId = parseUserKey(key);
    if (!userId) return;

    ids.add(userId);
    const firstMeta = value?.metas?.[0];
    if (firstMeta) meta[userId] = firstMeta;
  });

  return { ids, meta };
}

function applyDiff(current, diff) {
  const ids = new Set(current.ids);
  const meta = { ...current.meta };

  Object.entries(diff?.joins || {}).forEach(([key, value]) => {
    const userId = parseUserKey(key);
    if (!userId) return;
    ids.add(userId);
    const firstMeta = value?.metas?.[0];
    if (firstMeta) meta[userId] = firstMeta;
  });

  Object.entries(diff?.leaves || {}).forEach(([key]) => {
    const userId = parseUserKey(key);
    if (!userId) return;
    ids.delete(userId);
    delete meta[userId];
  });

  return { ids, meta };
}

export function PresenceProvider({ children }) {
  const token = useAuthStore(state => state.token);
  const userId = useAuthStore(state => state.currentUser?.id);
  const [presence, setPresence] = useState(EMPTY_PRESENCE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token || !userId) {
      setPresence(EMPTY_PRESENCE);
      setReady(false);
      return undefined;
    }

    acquireSocket(token);

    const topic = `user_notifications:${userId}`;
    const unsubscribe = subscribeToTopic(topic, (payload, eventName) => {
      if (eventName === 'presence_state') {
        setPresence(stateToPresence(payload));
        setReady(true);
      }

      if (eventName === 'presence_diff') {
        setPresence(current => applyDiff(current, payload));
        setReady(true);
      }
    });

    return () => {
      unsubscribe();
      setPresence(EMPTY_PRESENCE);
      setReady(false);
    };
  }, [token, userId]);

  const value = useMemo(
    () => ({
      onlineUserIds: presence.ids,
      onlineCount: presence.ids.size,
      ready,
      isOnline: id => {
        if (id === null || id === undefined) return false;
        return presence.ids.has(Number(id));
      },
      lastSeenFor: id => {
        if (id === null || id === undefined) return null;
        return presence.meta[Number(id)]?.last_login ?? null;
      },
    }),
    [presence, ready],
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export default PresenceProvider;
