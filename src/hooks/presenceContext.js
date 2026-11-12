import { createContext } from 'react';

export const EMPTY_PRESENCE = { ids: new Set(), meta: {} };

export const PresenceContext = createContext({
  onlineUserIds: new Set(),
  isOnline: () => false,
  lastSeenFor: () => null,
  onlineCount: 0,
  ready: false,
});
