import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useNotificationChannel } from '@/hooks/useNotificationChannel';

/**
 * Persistent authenticated dashboard shell.
 *
 * The notification socket is mounted once here, not per card or per page, so
 * navigating between discovery, shortlist, and notifications keeps a single
 * channel joined to `user_notifications:<id>`.
 */
export function DashboardLayout() {
  const token = useAuthStore(state => state.token);
  const userId = useAuthStore(state => state.currentUser?.id);

  useNotificationChannel({ token, userId, enabled: Boolean(token && userId) });

  return <Outlet />;
}

export default DashboardLayout;
