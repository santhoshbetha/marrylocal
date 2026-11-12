import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { disconnectSocket } from '@/lib/socket';

/**
 * Auth teardown for the Zustand + TanStack Query shell.
 *
 * The backend call is best-effort; the local session and every cached query are
 * cleared even when the network is down.
 */
export const useAuthActions = () => {
  const logoutStore = useAuthStore(state => state.logout);
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await apiClient.delete('/api/v1/auth/logout');
    } catch (error) {
      console.error('Backend logout session invalidation failed', error);
    } finally {
      logoutStore();
      queryClient.clear();
      disconnectSocket();
      setIsLoggingOut(false);
    }
  };

  return { handleLogout, isLoggingOut };
};

export default useAuthActions;
