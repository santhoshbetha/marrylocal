import { useMemo } from 'react';
import { MapPin, Heart, Bookmark, X, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { describeApiError } from '@/api/client';
import { PresenceBadge } from '@/components/PresenceBadge';
import { VerificationBadges } from '@/components/VerificationBadges';
import { useProfileInteraction } from '@/hooks/useDiscovery';

function distanceLabel(profile) {
  const meters =
    typeof profile?.distance_meters === 'number'
      ? profile.distance_meters
      : typeof profile?.distance_km === 'number'
        ? profile.distance_km * 1000
        : null;

  if (meters === null) return null;
  if (meters < 1_000) return `~${Math.max(1, Math.round(meters))} m away`;

  const km = meters / 1000;
  return km < 10 ? `~${km.toFixed(1)} km away` : `~${Math.round(km)} km away`;
}

function resolveImage(profile) {
  const first = profile?.avatar_url || profile?.images?.[0];
  if (!first) return null;
  if (String(first).startsWith('http') || String(first).startsWith('/')) return first;
  return null;
}

export function ProfileCard({ profile, onOpen, onRemove, removePending = false }) {
  const image = useMemo(() => resolveImage(profile), [profile]);
  const initials =
    `${profile?.first_name?.[0] ?? profile?.firstname?.[0] ?? ''}${
      profile?.last_name?.[0] ?? profile?.lastname?.[0] ?? ''
    }`.toUpperCase() || 'ML';

  const mutation = useProfileInteraction();

  const isLiked = Boolean(profile?.is_liked);
  const isShortlisted = Boolean(profile?.is_shortlisted);

  const handleAction = kind => event => {
    event.stopPropagation();

    if (kind === 'like' && isLiked) return;
    if (kind === 'shortlist' && isShortlisted) return;

    mutation.mutate(
      { kind, targetId: profile.id },
      {
        onSuccess: response => {
          const isMatch = response?.data?.is_match;
          if (isMatch) toast.success("It's a match!");
          else if (kind === 'shortlist') toast.success('Profile shortlisted');
          else if (kind === 'like') toast.success('Interaction saved successfully!');
        },
        onError: error => toast.error(describeApiError(error, 'Could not save that action.')),
      },
    );
  };

  const distance = distanceLabel(profile);
  const name =
    [profile?.first_name || profile?.firstname, profile?.last_name || profile?.lastname]
      .filter(Boolean)
      .join(' ') || 'Member';
  const likePending = mutation.isPending && mutation.variables?.kind === 'like';
  const shortlistPending = mutation.isPending && mutation.variables?.kind === 'shortlist';
  const removing = Boolean(onRemove) && removePending;

  return (
    <article
      data-testid="profile-card"
      onClick={() => onOpen?.(profile)}
      aria-busy={removing}
      className="group relative overflow-hidden bg-card border border-border rounded-3xl p-6 shadow-xs transition-all duration-300 hover:shadow-md dark:border-border cursor-pointer"
    >
      {removing ? (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-background/75 backdrop-blur-[1px]"
          onClick={event => event.stopPropagation()}
        >
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : null}
      <div className="flex items-start gap-4">
        <div className="relative aspect-square h-20 w-20 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border">
          {image ? (
            <img
              src={image}
              alt={name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-2xl font-black text-primary">
              {initials}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold tracking-tight text-foreground">
                {name}
                {profile?.age ? (
                  <span className="font-medium text-muted-foreground">, {profile.age}</span>
                ) : null}
              </h3>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {profile?.user_handle ? `@${profile.user_handle}` : 'Verified local member'}
              </p>
              <VerificationBadges user={profile} className="mt-2" />
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-3 w-3" />
              Local
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <PresenceBadge profile={profile} />
            {(profile?.city || profile?.state) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-1 font-medium text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {[profile.city, profile.state].filter(Boolean).join(', ')}
              </span>
            )}
            {distance && (
              <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 font-semibold text-accent-foreground">
                {distance}
              </span>
            )}
            {profile?.community && (
              <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-1 font-medium text-rose-700 dark:text-rose-400">
                {profile.community}
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {profile?.bio ||
          `Hi, I'm ${name}. I'm looking for a meaningful local connection within my community.`}
      </p>

      <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 dark:border-border">
        <button
          type="button"
          data-testid="like-button"
          onClick={handleAction('like')}
          disabled={isLiked || mutation.isPending}
          aria-pressed={isLiked}
          title="Like this profile! If they like you back, you will achieve a 'Mutual Match' and be notified instantly of your connection."
          className={
            isLiked
              ? 'inline-flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground font-bold'
              : 'inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-900 font-bold shadow-xs transition-all duration-300 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60'
          }
        >
          {likePending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Heart className="h-4 w-4" fill={isLiked ? 'currentColor' : 'none'} />
          )}
          {isLiked ? 'Liked' : 'Like'}
        </button>

        <button
          type="button"
          data-testid="shortlist-button"
          onClick={handleAction('shortlist')}
          disabled={isShortlisted || mutation.isPending}
          aria-pressed={isShortlisted}
          title="Bookmark this profile privately to your dashboard. The other user will not be notified."
          className={
            isShortlisted
              ? 'inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground font-bold'
              : 'inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary px-4 py-2.5 text-sm text-foreground font-bold shadow-xs transition-all duration-300 hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-60'
          }
        >
          {shortlistPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bookmark className="h-4 w-4" fill={isShortlisted ? 'currentColor' : 'none'} />
          )}
          {isShortlisted ? 'Shortlisted' : 'Shortlist'}
        </button>

        <button
          type="button"
          data-testid="dislike-button"
          onClick={event => {
            if (onRemove) {
              event.stopPropagation();
              onRemove(profile);
              return;
            }
            handleAction('dislike')(event);
          }}
          disabled={removing || (!onRemove && mutation.isPending)}
          aria-label={onRemove ? 'Remove from shortlist' : 'Dislike profile'}
          title={onRemove ? 'Remove this profile from your shortlist' : 'Remove this profile'}
          className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-card px-3 py-2.5 text-muted-foreground transition-all duration-300 hover:bg-accent disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-60"
        >
          {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        </button>
      </div>
    </article>
  );
}

export default ProfileCard;
