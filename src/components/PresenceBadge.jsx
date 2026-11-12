import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { usePresence } from '@/hooks/usePresence';

dayjs.extend(relativeTime);

export function PresenceBadge({ profile, className = '' }) {
  const { isOnline, lastSeenFor, ready } = usePresence();

  const online = ready
    ? isOnline(profile?.id)
    : Boolean(profile?.is_online) || isOnline(profile?.id);
  const lastActive =
    lastSeenFor(profile?.id) ||
    profile?.last_active_at ||
    profile?.last_login_at ||
    profile?.last_seen_at;

  if (online) {
    return (
      <span
        role="status"
        className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 ${className}`}
      >
        <span aria-hidden="true">🟢</span>
        Online Now
      </span>
    );
  }

  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-xs font-semibold text-muted-foreground ${className}`}
      title={lastActive ? dayjs(lastActive).format('DD MMM YYYY, HH:mm') : undefined}
    >
      <span aria-hidden="true">⏱</span>
      Active: {lastActive ? dayjs(lastActive).fromNow() : 'Recently joined'}
    </span>
  );
}

export default PresenceBadge;
