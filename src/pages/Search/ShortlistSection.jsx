import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Loader2, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mediaUrl } from '@/lib/media';
import {
  flattenShortlistPages,
  useRemoveFromShortlist,
  useShortlistData,
} from '@/hooks/useShortlist';

function ShortlistCard({ profile, onRemove, removing }) {
  const name = profile?.first_name ?? profile?.firstname ?? 'Member';
  const image =
    profile?.avatar_url ??
    (profile?.images?.[0] ? mediaUrl(profile?.shortid, profile.images[0]) : null);

  return (
    <article className="group relative bg-card border border-border rounded-3xl p-6 shadow-xs transition-transform hover:scale-[1.01] duration-200">
      <Link to={`/user/${profile?.shortid}`} className="block">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-50 to-amber-100 ring-1 ring-border">
            {image ? (
              <img
                src={image}
                alt={name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xl font-black text-amber-900/70">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 pr-8">
            <h3 className="truncate text-lg font-bold text-foreground">
              {name}
              {profile?.age ? (
                <span className="font-medium text-muted-foreground">, {profile.age}</span>
              ) : null}
            </h3>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {profile?.user_handle ? `@${profile.user_handle}` : 'Shortlisted member'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {(profile?.city || profile?.state) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-1 font-medium text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {[profile.city, profile.state].filter(Boolean).join(', ')}
                </span>
              )}
              {profile?.community && (
                <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-700">
                  {profile.community}
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {profile?.bio || `You shortlisted ${name}. Continue the conversation when you are ready.`}
        </p>
      </Link>

      <button
        type="button"
        onClick={() => onRemove(profile?.shortid)}
        disabled={removing}
        aria-label={`Remove ${name} from shortlist`}
        className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
      </button>
    </article>
  );
}

export function ShortlistSection() {
  const query = useShortlistData();
  const removeMutation = useRemoveFromShortlist();
  const profiles = useMemo(() => flattenShortlistPages(query.data), [query.data]);

  const handleRemove = shortid => {
    removeMutation.mutate({ shortidtoremove: shortid });
  };

  if (query.isLoading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-border bg-card shadow-xs">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-rose-50 p-8 text-center shadow-xs">
        <p className="text-lg font-bold text-rose-900">Shortlist could not load</p>
        <p className="mt-2 text-sm text-rose-700">{query.error?.message}</p>
        <Button variant="outline" className="mt-5 rounded-xl" onClick={() => query.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-card p-12 text-center shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <Heart className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-xl font-bold text-foreground">No shortlisted profiles yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Use the Shortlist action on a discovery card to save a profile here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="shortlist-section">
      <div className="flex items-center justify-between rounded-3xl border border-border bg-card p-5 shadow-xs">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-700">
            Saved profiles
          </p>
          <h2 className="mt-1 text-2xl font-black text-foreground">Your shortlist</h2>
        </div>
        <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-bold text-rose-700">
          {profiles.length} saved
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {profiles.map(profile => (
          <ShortlistCard
            key={profile?.shortid || profile?.id}
            profile={profile}
            onRemove={handleRemove}
            removing={
              removeMutation.isPending &&
              removeMutation.variables?.shortidtoremove === profile?.shortid
            }
          />
        ))}
      </div>

      {query.hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className="rounded-2xl bg-amber-400 px-7 text-slate-900 dark:text-slate-900 font-bold shadow-xs hover:bg-amber-300"
          >
            {query.isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'View More Matches'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export default ShortlistSection;
