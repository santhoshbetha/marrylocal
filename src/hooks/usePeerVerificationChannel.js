import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { acquireSocket, isSocketConnected, onSocketOpen, subscribeToTopic } from '@/lib/socket';
import { PROFILE_ME_KEY } from '@/hooks/useProfile';
import { useAuthStore } from '@/store/authStore';

const PEER_VERIFICATION_EVENT = 'peer_verification_updated';
const topicSubscriptions = new Map();

/**
 * Applies a pushed peer-verification payload to the cached profile so the
 * progress card updates before the reconciling fetch completes.
 */
function applyPeerVerificationPayload(queryClient, payload) {
  if (!payload || typeof payload !== 'object') return;

  const patch = {
    peer_vouches_received: payload.peer_vouches_received,
    peer_verified: payload.peer_verified,
    is_peer_verifier: payload.is_peer_verifier,
    vouch_credits_remaining: payload.vouch_credits_remaining,
  };

  // Keep the navigation shell (which reads the auth store) in sync with the
  // progress card so "Verify Peers" appears without a reload.
  const definedPatch = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  );

  if (Object.keys(definedPatch).length > 0) {
    useAuthStore.getState().updateProfile(definedPatch);
  }

  queryClient.setQueryData(PROFILE_ME_KEY, current => {
    if (!current) return current;

    return {
      ...current,
      ...definedPatch,
    };
  });
}

/**
 * Shares one Phoenix channel handler per topic. The dashboard notification
 * hook may already be joined to the same `user_notifications:<id>` topic, so
 * this only adds another handler rather than opening a second socket.
 */
function acquirePeerVerificationTopic(topic, queryClient) {
  let entry = topicSubscriptions.get(topic);

  if (!entry) {
    const unsubscribe = subscribeToTopic(topic, (payload, eventName) => {
      if (eventName !== PEER_VERIFICATION_EVENT) return;

      applyPeerVerificationPayload(queryClient, payload);

      // Reconcile derived profile fields (for example the cleared verification
      // gate) with exactly one request per real event, never on a timer.
      queryClient.invalidateQueries({ queryKey: PROFILE_ME_KEY });
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
 * Live peer-verification updates over the authenticated Phoenix socket.
 *
 * Replaces profile polling on the Verification page. A vouch recorded on a
 * verifier's device or an admin grant pushes `peer_verification_updated` to
 * this member's topic, which updates the badge, vouch tally, and credits
 * immediately.
 */
export function usePeerVerificationChannel({ enabled = true } = {}) {
  const queryClient = useQueryClient();
  const token = useAuthStore(state => state.token);
  const userId = useAuthStore(state => state.currentUser?.id);

  useEffect(() => {
    if (!enabled || !token || !userId) return undefined;

    acquireSocket(token);
    return acquirePeerVerificationTopic(`user_notifications:${userId}`, queryClient);
  }, [enabled, queryClient, token, userId]);

  // A push is lost if the socket reconnects or the tab sleeps. Catch up when
  // the browser comes back online, the member returns to the tab, or the socket
  // reconnects.
  useEffect(() => {
    if (!enabled) return undefined;

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_ME_KEY });
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    let hasConnected = isSocketConnected();

    const unsubscribeOpen = onSocketOpen(() => {
      if (!hasConnected) {
        // Initial connection; the profile query already fetched on mount.
        hasConnected = true;
        return;
      }

      refresh();
    });

    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubscribeOpen();
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, queryClient]);
}

export default usePeerVerificationChannel;
