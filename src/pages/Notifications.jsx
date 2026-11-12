import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Heart, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNotificationChannel } from '@/hooks/useNotificationChannel';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

dayjs.extend(relativeTime);

const TYPE_STYLES = {
  system: {
    label: 'System',
    icon: ShieldCheck,
    iconClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  },
  profile_like: {
    label: 'Profile like',
    icon: Heart,
    iconClass: 'bg-primary/10 text-primary',
    badgeClass: 'bg-primary/10 text-primary',
  },
  mutual_match: {
    label: 'Mutual match',
    icon: Sparkles,
    iconClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
};

function styleFor(type) {
  return TYPE_STYLES[type] ?? TYPE_STYLES.system;
}

function safePath(value) {
  if (typeof value !== 'string') return null;

  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return null;

  return path;
}

function notificationDestination(notification) {
  const metadata = notification?.metadata ?? {};
  const explicitPath = safePath(metadata.url) ?? safePath(metadata.path);
  if (explicitPath) return explicitPath;

  switch (notification?.type) {
    case 'profile_like':
    case 'profile_shortlist':
      return profilePath(metadata.sender_shortid ?? metadata.sender_id ?? notification.actor_id);
    case 'mutual_match':
      return profilePath(metadata.match_shortid ?? metadata.match_id ?? notification.actor_id);
    default:
      return null;
  }
}

function profilePath(profileId) {
  if (profileId === null || profileId === undefined || profileId === '') return null;
  return `/user/${profileId}`;
}

function NotificationRow({ notification, onOpen, disabled }) {
  const style = styleFor(notification.type);
  const Icon = style.icon;
  const isUnread = !notification.is_read;
  const destination = notificationDestination(notification);
  const isActionable = isUnread || Boolean(destination);
  const timestamp = notification.inserted_at
    ? dayjs(notification.inserted_at).fromNow()
    : 'Just now';

  const actionLabel = isUnread
    ? destination
      ? 'Mark as read and open'
      : 'Mark as read'
    : destination
      ? 'Open'
      : null;

  return (
    <button
      type="button"
      data-testid={`notification-${notification.id}`}
      onClick={() => onOpen(notification)}
      disabled={disabled && isUnread}
      className={cn(
        'flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-colors',
        isUnread
          ? 'border-primary/25 bg-primary/[0.04] hover:bg-primary/[0.07]'
          : 'border-border/60 bg-card hover:bg-muted/40',
        isActionable ? 'cursor-pointer' : 'cursor-default',
      )}
      aria-label={actionLabel ? `${notification.title}. ${actionLabel}.` : notification.title}
    >
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
          style.iconClass,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-foreground">{notification.title}</span>
          <Badge
            variant="secondary"
            className={cn(
              'rounded-full border-0 px-2 py-0.5 text-[10px] font-bold',
              style.badgeClass,
            )}
          >
            {style.label}
          </Badge>
          {isUnread ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
        </span>

        {notification.body ? (
          <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
            {notification.body}
          </span>
        ) : null}

        <span className="mt-2 block text-[11px] font-medium text-muted-foreground">
          {timestamp}
          {actionLabel ? ` · ${actionLabel}` : ''}
        </span>
      </span>
    </button>
  );
}

export function Notifications() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { topic } = useNotificationChannel();
  const notificationsQuery = useNotifications(page);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = notificationsQuery.data?.notifications ?? [];
  const pagination = notificationsQuery.data?.pagination ?? {
    page: 1,
    total_pages: 0,
    total: 0,
  };
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  const handleMarkRead = notificationId => {
    markRead.mutate(notificationId, {
      onError: error => {
        toast.error(error?.message || 'Could not mark that notification as read.');
      },
    });
  };

  const handleNotificationOpen = notification => {
    if (!notification.is_read) {
      handleMarkRead(notification.id);
    }

    const destination = notificationDestination(notification);
    if (destination) navigate(destination);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => toast.success('All notifications marked as read.'),
      onError: error => {
        toast.error(error?.message || 'Could not mark all notifications as read.');
      },
    });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Bell className="h-6 w-6" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-foreground">
                    Notifications
                  </h1>
                  {unreadCount > 0 ? (
                    <Badge className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                      {unreadCount} unread
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  Likes, mutual matches, and platform alerts appear here in real time.
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending || unreadCount === 0}
              className="rounded-xl bg-primary px-4 font-bold text-primary-foreground hover:bg-primary/90"
            >
              {markAllRead.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="mr-2 h-4 w-4" />
              )}
              Mark all read
            </Button>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-4 shadow-xs sm:p-6">
          {notificationsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`notification-skeleton-${index}`}
                  className="h-24 animate-pulse rounded-2xl bg-muted/60"
                />
              ))}
            </div>
          ) : notificationsQuery.isError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center">
              <p className="font-bold text-destructive">Notifications could not load</p>
              <p className="mt-1 text-sm text-destructive/90">
                {notificationsQuery.error?.message || 'Check your connection and try again.'}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => notificationsQuery.refetch()}
                className="mt-4 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                Retry
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bell className="h-7 w-7" />
              </span>
              <p className="mt-4 text-lg font-bold text-foreground">You are all caught up</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                New likes, mutual matches, and system alerts will arrive here automatically.
              </p>
            </div>
          ) : (
            <div className={cn('space-y-3', notificationsQuery.isFetching && 'opacity-70')}>
              {notifications.map(notification => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onOpen={handleNotificationOpen}
                  disabled={markRead.isPending}
                />
              ))}
            </div>
          )}

          {pagination.total_pages > 1 ? (
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
              <p className="text-xs font-medium text-muted-foreground">
                Page {pagination.page} of {pagination.total_pages}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(current => Math.max(1, current - 1))}
                  disabled={pagination.page <= 1 || notificationsQuery.isFetching}
                  className="rounded-xl"
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(current => Math.min(pagination.total_pages, current + 1))}
                  disabled={
                    pagination.page >= pagination.total_pages || notificationsQuery.isFetching
                  }
                  className="rounded-xl"
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Live channel: <span className="font-mono">{topic ?? 'connecting...'}</span>
        </p>
      </div>
    </div>
  );
}

export default Notifications;
