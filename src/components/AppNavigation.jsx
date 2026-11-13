import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Bell,
  BellRing,
  Bookmark,
  CreditCard,
  Images,
  Loader2,
  Mail,
  MapPin,
  Search,
  Settings,
  Shield,
  ScanLine,
  UserPen,
  Users,
  WifiOff,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MobileBottomNav, Sidebar } from '@/components/Sidebar';
import { PresenceProvider } from '@/hooks/PresenceProvider';
import { toast } from 'sonner';
import { useAuth } from '../store/authStore';
import { useAuthActions } from '../hooks/useAuthActions';
import { updateUserInfo } from '../api/profiles';

export function AppNavigation({ children }) {
  const { user, profiledata, setProfiledata, loading, token } = useAuth();
  const { handleLogout, isLoggingOut } = useAuthActions();
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored!');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Connection lost. Please check your internet connection.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (user && profiledata?.userstate === 'inactive') {
      setShowReactivateDialog(true);
    }
  }, [user, profiledata]);

  const handleCancel = async () => {
    await handleLogout();
  };

  const handleReactivate = async () => {
    setIsReactivating(true);
    try {
      const userstatedata = {
        userstate: 'active',
        onetimefeespaid: false,
        dateofactivation: new Date().toISOString(),
      };
      const res = await updateUserInfo(user?.id, userstatedata);

      if (res.success) {
        setProfiledata({ ...profiledata, ...userstatedata });
        toast.success('Profile reactivated successfully!');
        setShowReactivateDialog(false);
      } else {
        toast.error('Failed to reactivate profile. Please try again.');
      }
    } catch (error) {
      console.error('Reactivation error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsReactivating(false);
    }
  };

  const role = String(user?.role ?? profiledata?.role ?? '').toLowerCase();
  const isAdmin = role === 'admin' || user?.is_admin === true || profiledata?.is_admin === true;

  const navigationGroups = useMemo(() => {
    if (isAdmin) {
      return [
        {
          label: 'Administration',
          items: [
            { to: '/admin', label: 'User Management', icon: Shield, end: true },
            { to: '/admin/bulk', label: 'Bulk Operations', icon: Users, end: true },
            { to: '/admin/profiles', label: 'User Profiles', icon: UserPen, end: true },
            { to: '/admin/userlist', label: 'Users by Location', icon: MapPin, end: true },
            { to: '/admin/emails', label: 'Email Templates', icon: Mail, end: true },
            {
              to: '/admin/notifications',
              label: 'System Notifications',
              icon: BellRing,
              end: true,
            },
          ],
        },
      ];
    }

    const discoverItems = [
      {
        to: '/dashboard/search',
        label: 'Discovery',
        icon: Search,
        end: true,
        matchPaths: ['/dashboard', '/dashboard/search', '/discovery'],
      },
      {
        to: '/dashboard/search-user',
        label: 'Search',
        icon: Search,
        end: true,
        matchPaths: ['/dashboard/search-user', '/search'],
      },
      {
        to: '/dashboard/shortlist',
        label: 'Shortlist',
        icon: Bookmark,
        end: true,
        matchPaths: ['/dashboard/shortlist'],
      },
      { to: '/location', label: 'Location', icon: MapPin, end: true },
    ];

    const paymentEnforcementActive = Boolean(
      user?.payment_enforcement_active ?? user?.paymentenforcementactive,
    );

    if (paymentEnforcementActive) {
      discoverItems.splice(2, 0, {
        to: '/dashboard/servicefees',
        label: 'Service Fees',
        icon: CreditCard,
        end: true,
      });
    }

    const verificationSource = profiledata ?? user ?? {};
    const idVerified = Boolean(
      verificationSource.id_verified ??
        verificationSource.aadhaar_verified ??
        verificationSource.aadhar_verified ??
        verificationSource.passport_verified ??
        verificationSource.license_verified,
    );
    const peerVerified = Boolean(verificationSource.peer_verified);
    const verified = idVerified || peerVerified;
    const activeVerifier =
      Boolean(verificationSource.is_peer_verifier) &&
      Number(verificationSource.vouch_credits_remaining ?? 0) > 0;

    const verifyItem = activeVerifier
      ? {
          to: '/verify?tab=scanner',
          label: 'Verify Peers',
          icon: ScanLine,
          end: true,
          matchPaths: ['/verify', '/verification'],
        }
      : verified
        ? null
        : { to: '/verify', label: 'Verify', icon: BadgeCheck, end: true };

    const accountItems = [
      { to: '/profile', label: 'Profile', icon: UserPen, end: true },
      { to: '/photos', label: 'Photos', icon: Images, end: true },
      verifyItem,
      {
        to: '/dashboard/notifications',
        label: 'Notifications',
        icon: Bell,
        end: true,
        badge: 'notifications',
      },
      { to: '/settings', label: 'Settings', icon: Settings, end: true },
    ].filter(Boolean);

    return [
      { label: 'Discover', items: discoverItems },
      { label: 'Account', items: accountItems },
    ];
  }, [isAdmin, profiledata, user]);

  const mobileItems = useMemo(() => {
    if (isAdmin) return navigationGroups[0]?.items ?? [];

    const byLabel = new Map(
      navigationGroups.flatMap(group => group.items).map(item => [item.label, item]),
    );

    return [
      byLabel.get('Discovery'),
      byLabel.get('Search'),
      byLabel.get('Shortlist'),
      byLabel.get('Profile'),
      byLabel.get('Settings'),
    ].filter(Boolean);
  }, [isAdmin, navigationGroups]);

  // Do not mount regular-user navigation while an existing token is still
  // hydrating. This prevents the admin sidebar from flashing/disappearing.
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

  return (
    <>
      <Dialog open={showReactivateDialog} modal>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reactivate Your Profile</DialogTitle>
            <DialogDescription>
              Your profile is currently inactive. Reactivate it to continue using discovery,
              shortlists, and matching.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCancel} disabled={isReactivating}>
              Cancel
            </Button>
            <Button onClick={handleReactivate} disabled={isReactivating}>
              {isReactivating ? 'Reactivating...' : 'Reactivate Profile'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {user ? (
        <PresenceProvider>
          <div className="min-h-screen bg-background">
            <div className="flex min-h-screen">
              <Sidebar
                groups={navigationGroups}
                user={user}
                profiledata={profiledata}
                isOnline={isOnline}
                isLoggingOut={isLoggingOut}
                onLogout={handleLogout}
              />

              <main className="relative min-w-0 flex-1 pb-20 md:pb-0">
                {!isOnline && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="mx-4 max-w-sm rounded-2xl bg-card p-6 text-center shadow-lg">
                      <WifiOff className="mx-auto mb-4 h-12 w-12 text-rose-500" />
                      <h3 className="mb-2 text-lg font-semibold text-foreground">
                        No Internet Connection
                      </h3>
                      <p className="mb-4 text-muted-foreground">
                        Please check your internet connection and try again later.
                      </p>
                      <Button onClick={() => window.location.reload()} className="w-full">
                        Retry
                      </Button>
                    </div>
                  </div>
                )}

                {isLoggingOut && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="mx-4 max-w-sm rounded-2xl bg-card p-6 text-center shadow-lg">
                      <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
                      <h3 className="mb-2 text-lg font-semibold text-foreground">Logging Out</h3>
                      <p className="text-muted-foreground">Securely ending your session...</p>
                    </div>
                  </div>
                )}

                {children}
              </main>
            </div>

            <MobileBottomNav items={mobileItems} isOnline={isOnline} isLoggingOut={isLoggingOut} />
          </div>
        </PresenceProvider>
      ) : (
        children
      )}
    </>
  );
}

export default AppNavigation;
