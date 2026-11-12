import { NavLink, useLocation } from 'react-router-dom';
import { Loader2, LogOut, Wifi, WifiOff } from 'lucide-react';
import { useNotificationChannel } from '@/hooks/useNotificationChannel';
import { useUnreadNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

function initials(user) {
  const first = user?.first_name || user?.firstname || '';
  const last = user?.last_name || user?.lastname || '';
  const value = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  return value || 'ML';
}

function NavigationItem({ item, isOnline, isLoggingOut, unreadCount = 0 }) {
  const location = useLocation();
  const Icon = item.icon;
  const forcedActive = item.matchPaths?.includes(location.pathname);

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={event => {
        if (!isOnline || isLoggingOut) {
          event.preventDefault();
        }
      }}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-200',
          (forcedActive ?? isActive)
            ? 'bg-primary/10 text-primary font-bold rounded-xl px-4 py-3 shadow-xs'
            : 'text-muted-foreground font-medium hover:bg-accent hover:text-accent-foreground',
          (!isOnline || isLoggingOut) && 'pointer-events-none opacity-50',
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge === 'notifications' && unreadCount > 0 ? (
        <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black text-primary-foreground">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
    </NavLink>
  );
}

export function Sidebar({ groups, user, profiledata, isOnline, isLoggingOut, onLogout }) {
  const role = String(user?.role ?? profiledata?.role ?? '').toLowerCase();
  const isAdmin = role === 'admin' || user?.is_admin === true || profiledata?.is_admin === true;

  const { data: unreadCount = 0 } = useUnreadNotifications(!isAdmin);
  useNotificationChannel({ enabled: !isAdmin });

  const displayName =
    [profiledata?.firstname || user?.first_name, profiledata?.lastname || user?.last_name]
      .filter(Boolean)
      .join(' ') || 'MarryLocal member';

  return (
    <aside className="bg-card border-r border-border p-6 space-y-6 flex flex-col h-screen dark:border-border hidden md:flex sticky top-0 w-72 shrink-0">
      <div className="rounded-2xl border border-border bg-muted/40 p-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
            {initials(profiledata || user)}
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card',
                isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/50',
              )}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {isOnline ? 'Online now' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto pr-1">
        {groups.map(group => (
          <div key={group.label} className="space-y-2">
            <p className="px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map(item => (
                <NavigationItem
                  key={item.to}
                  item={item}
                  isOnline={isOnline}
                  isLoggingOut={isLoggingOut}
                  unreadCount={unreadCount}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-border pt-4">
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold',
            isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
          )}
        >
          {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {isOnline ? 'Connected' : 'Connection lost'}
        </div>

        <button
          type="button"
          onClick={onLogout}
          disabled={!isOnline || isLoggingOut}
          className="flex w-full items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoggingOut ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LogOut className="h-5 w-5" />
          )}
          {isLoggingOut ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </aside>
  );
}

export function MobileBottomNav({ items, isOnline, isLoggingOut }) {
  const location = useLocation();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card shadow-lg md:hidden"
    >
      <div className="grid h-16 grid-cols-5">
        {items.slice(0, 5).map(item => {
          const Icon = item.icon;
          const forcedActive = item.matchPaths?.includes(location.pathname);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={event => {
                if (!isOnline || isLoggingOut) event.preventDefault();
              }}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors',
                  (forcedActive ?? isActive)
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                  (!isOnline || isLoggingOut) && 'pointer-events-none opacity-50',
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate px-1">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default Sidebar;
