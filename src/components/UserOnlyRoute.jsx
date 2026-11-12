import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/store/authStore';

/**
 * User-only routes such as discovery and the personal notification feed.
 * Admins are sent to the admin dashboard after hydration.
 */
function UserOnlyRoute() {
  const { user, profiledata, loading, token } = useAuth();

  const role = String(user?.role ?? profiledata?.role ?? '').toLowerCase();
  const isAdmin = role === 'admin' || user?.is_admin === true || profiledata?.is_admin === true;

  if (token && (loading || !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-border/60 bg-card p-8 shadow-xs">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          <p className="text-sm font-medium text-muted-foreground">Restoring your session...</p>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}

export default UserOnlyRoute;
