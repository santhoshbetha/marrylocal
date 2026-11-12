import React, { useState, useEffect } from 'react';
import AppRouter from './AppRouter';
import { Layout } from '@/components/Layout';
import { NavBefore } from '@/components/NavBefore';
import { NavAfter } from '@/components/NavAfter';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { AuthVerify } from './commons/AuthVerify';
import { Suspense, lazy } from 'react';

const LOGIN_LOADING_TIMEOUT_MS = 15000;

// Error Boundary for lazy loading failures
class LazyLoadErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Check if it's a chunk loading error
    if (
      error.message &&
      (error.message.includes('Loading failed for the module') ||
        error.message.includes('ChunkLoadError') ||
        error.message.includes('error loading dynamically imported module'))
    ) {
      console.error('Lazy loading error detected:', error);
      // Trigger cache clear and reload
      if ('caches' in window) {
        caches
          .keys()
          .then(names => {
            return Promise.all(names.map(name => caches.delete(name)));
          })
          .then(() => {
            window.location.reload();
          })
          .catch(() => {
            window.location.reload();
          });
      } else {
        window.location.reload();
      }
      return { hasError: true };
    }
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy loading error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4 p-6 bg-background/90 rounded-2xl shadow-2xl border border-border">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/30 border-t-primary"></div>
            <p className="text-sm text-muted-foreground font-medium">Reloading app...</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Global Loading Context
export const GlobalLoadingContext = React.createContext();

export const useGlobalLoading = () => {
  const context = React.useContext(GlobalLoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within a GlobalLoadingProvider');
  }
  return context;
};

/*
USAGE EXAMPLE:
import { useGlobalLoading } from '../App';

function MyComponent() {
  const { setGlobalLoading } = useGlobalLoading();

  const handleAsyncOperation = async () => {
    setGlobalLoading(true);
    try {
      await someAsyncOperation();
    } finally {
      setGlobalLoading(false);
    }
  };

  return <button onClick={handleAsyncOperation}>Do Something</button>;
}
*/

function App() {
  const user = useAuthStore(state => state.currentUser);
  const profiledata = useAuthStore(state => state.profiledata);
  const authLoading = useAuthStore(state => state.loading);
  const bootstrapSession = useAuthStore(state => state.bootstrapSession);
  const [shouldLoadTermsPopup, setShouldLoadTermsPopup] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalLoadingTimedOut, setGlobalLoadingTimedOut] = useState(false);
  const isResolvingAuthenticatedApp = Boolean(user) && (authLoading || !profiledata);

  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

  // Lazy load TermsPopup only when needed
  const TermsPopup = lazy(() =>
    import('./pages/TermsPopup').then(module => ({ default: module.TermsPopup })),
  );

  // The gate applies to signed-in members only. Admins retain unrestricted
  // access so they can operate the moderation and billing dashboards.
  useEffect(() => {
    const account = profiledata ?? user;
    const isAdmin = account?.role === 'admin' || account?.is_admin === true;
    const termsAccepted = account?.terms_accepted ?? account?.termsaccepted;

    if (user && account && !isAdmin && termsAccepted === false) {
      setShouldLoadTermsPopup(true);
    } else {
      setShouldLoadTermsPopup(false);
    }
  }, [user, profiledata]);

  // Show global loading during login until profile data is loaded
  useEffect(() => {
    if (isResolvingAuthenticatedApp) {
      setGlobalLoading(true);
      setGlobalLoadingTimedOut(false);
      return;
    }

    setGlobalLoading(false);
    setGlobalLoadingTimedOut(false);
  }, [isResolvingAuthenticatedApp]);

  useEffect(() => {
    if (!isResolvingAuthenticatedApp) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setGlobalLoadingTimedOut(true);
    }, LOGIN_LOADING_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isResolvingAuthenticatedApp]);

  // Version check for app updates
  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Add timestamp to prevent any caching
        const timestamp = Date.now();
        const response = await fetch(`/meta.json?v=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        });

        if (!response.ok) {
          console.warn('Failed to fetch meta.json:', response.status);
          return;
        }

        const data = await response.json();
        const currentVersion = localStorage.getItem('app_version');

        if (currentVersion && data.version && data.version !== currentVersion) {
          console.log('New app version detected, updating and reloading...');
          localStorage.setItem('app_version', data.version);

          // Clear all caches
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
          }

          // Clear localStorage version before reload to force re-check
          localStorage.removeItem('app_version');

          // Force reload with cache busting
          window.location.href =
            window.location.href +
            (window.location.href.includes('?') ? '&' : '?') +
            'v=' +
            Date.now();
        } else if (data.version) {
          localStorage.setItem('app_version', data.version);
        }
      } catch (error) {
        console.warn('Version check failed:', error);
        // On version check failure, try a more aggressive reload for chunk errors
        if (
          error.message &&
          (error.message.includes('fetch') || error.message.includes('network'))
        ) {
          console.log('Network error during version check, attempting cache-bust reload');
          window.location.href =
            window.location.href +
            (window.location.href.includes('?') ? '&' : '?') +
            'v=' +
            Date.now();
        }
      }
    };

    // Check version immediately and then every 2 minutes
    checkVersion();
    const interval = setInterval(checkVersion, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <GlobalLoadingContext.Provider value={{ globalLoading, setGlobalLoading }}>
      <div className="App">
        <Toaster richColors />

        {/* Global Loading Spinner */}
        {globalLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 p-6 bg-background/90 rounded-2xl shadow-2xl border border-border">
              {!globalLoadingTimedOut && (
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/30 border-t-primary"></div>
              )}
              <p className="text-sm text-muted-foreground font-medium">
                {globalLoadingTimedOut ? 'Something wrong. Try later.' : 'Loading...'}
              </p>
            </div>
          </div>
        )}

        {user ? <NavAfter hideLogout={globalLoading} /> : <NavBefore />}
        <Layout>
          <LazyLoadErrorBoundary>
            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-screen">
                  <div className="flex flex-col items-center gap-4 p-6 bg-background/90 rounded-2xl shadow-2xl border border-border">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/30 border-t-primary"></div>
                    <p className="text-sm text-muted-foreground font-medium">Loading...</p>
                  </div>
                </div>
              }
            >
              <AppRouter />
            </Suspense>
          </LazyLoadErrorBoundary>
        </Layout>
        <AuthVerify />
        {shouldLoadTermsPopup && (
          <Suspense fallback={null}>
            <TermsPopup />
          </Suspense>
        )}
      </div>
    </GlobalLoadingContext.Provider>
  );
}

export default App;

/*
          <Layout>
            <AppRouter />
            {user ?
              <>
              </>
              :
              <Footer/>
            }
          </Layout>
*/
