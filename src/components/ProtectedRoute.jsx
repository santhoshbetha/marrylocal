import { useAuth } from '../store/authStore';
import { Outlet, Navigate } from 'react-router-dom';

function ProtectedRoute() {
  const { user, loading, token } = useAuth();

  // A persisted token with no hydrated user is still a valid session. Hold the
  // route instead of redirecting before `/profiles/me` resolves.
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

  return user ? <Outlet /> : <Navigate to="/" replace />;
}

export default ProtectedRoute;
