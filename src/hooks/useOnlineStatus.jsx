import { useSyncExternalStore } from 'react';

const subscribe = callback => {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);

  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
};

const getSnapshot = () => (typeof navigator === 'undefined' ? true : navigator.onLine);
const getServerSnapshot = () => true;

/**
 * Native browser connectivity signal.
 *
 * Backed by `online` / `offline` events through `useSyncExternalStore`, so any
 * layout can render live telemetry without duplicating listeners.
 */
export const useOnlineStatus = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

export default useOnlineStatus;
