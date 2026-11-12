import { useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Heart, Loader2, Sparkles, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ProfileCard } from '@/components/ProfileCard';
import { Button } from '@/components/ui/button';
import { apiClient, describeApiError } from '@/api/client';
import { profilePath } from '@/lib/profileNavigation';

const PAGE_SIZE = 20;

const TABS = {
  SHORTLISTED: 'shortlisted',
  LIKED_ME: 'liked-me',
};

async function fetchRelationshipPage(path, pageParam, signal) {
  const response = await apiClient.get(path, {
    params: { page: pageParam, per_page: PAGE_SIZE },
    signal,
  });

  const data = response.data?.data || {};

  return {
    users: data.users || [],
    pagination: data.pagination || {},
  };
}

function flattenPages(data) {
  return data?.pages?.flatMap(page => page.users ?? []) ?? [];
}

function TabButton({ active, icon, label, count, testId, onClick }) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-all duration-200 ${
        active
          ? 'bg-card text-foreground font-bold shadow-sm'
          : 'text-muted-foreground font-medium hover:text-foreground'
      }`}
    >
      {icon}
      <span>{label}</span>
      {typeof count === 'number' ? (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            active ? 'bg-amber-100 text-amber-900' : 'bg-muted text-muted-foreground'
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function Shortlist() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(TABS.SHORTLISTED);

  const removeShortlistMutation = useMutation({
    mutationFn: async targetUserId =>
      apiClient.delete(`/api/v1/relationships/shortlist/${targetUserId}`),
    onSuccess: () => {
      // Cross-invalidation keeps the shortlist tab and discovery cards in sync.
      queryClient.invalidateQueries({ queryKey: ['relationships', 'shortlisted'] });
      queryClient.invalidateQueries({ queryKey: ['profiles', 'shortlist'] });
      queryClient.invalidateQueries({ queryKey: ['profiles', 'discovery'] });
      queryClient.invalidateQueries({ queryKey: ['profiles', 'liked-me'] });
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      toast.success('Profile removed from shortlist.');
    },
    onError: error => {
      toast.error(describeApiError(error, 'Could not complete removal.'));
    },
  });

  const shortlistedQuery = useInfiniteQuery({
    queryKey: ['profiles', 'shortlist'],
    queryFn: ({ pageParam, signal }) =>
      fetchRelationshipPage('/api/v1/relationships/shortlisted', pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: lastPage =>
      lastPage?.pagination?.has_next_page ? lastPage.pagination.page + 1 : undefined,
    enabled: activeTab === TABS.SHORTLISTED,
    staleTime: 15_000,
  });

  const likedMeQuery = useInfiniteQuery({
    queryKey: ['profiles', 'liked-me'],
    queryFn: ({ pageParam, signal }) =>
      fetchRelationshipPage('/api/v1/relationships/liked-me', pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: lastPage =>
      lastPage?.pagination?.has_next_page ? lastPage.pagination.page + 1 : undefined,
    enabled: activeTab === TABS.LIKED_ME,
    staleTime: 15_000,
  });

  const activeQuery = activeTab === TABS.SHORTLISTED ? shortlistedQuery : likedMeQuery;

  const profiles = useMemo(() => flattenPages(activeQuery.data), [activeQuery.data]);
  const total = activeQuery.data?.pages?.[0]?.pagination?.total;
  const isEmpty = !activeQuery.isLoading && !activeQuery.isError && profiles.length === 0;

  const openProfile = profile => {
    navigate(profilePath(profile));
  };

  return (
    <main className="min-h-screen bg-background" data-testid="shortlist-dashboard">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
                <Sparkles className="h-3.5 w-3.5" />
                Your private matchmaking space
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
                Shortlist & Likes
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep track of the profiles you saved and the people who showed interest in you.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 self-start rounded-2xl bg-accent px-4 py-2 text-sm font-bold text-amber-900 sm:self-auto">
              <Users className="h-4 w-4" />
              {typeof total === 'number' ? `${total} profiles` : 'Your matches'}
            </div>
          </div>

          <div className="mt-6 inline-flex w-full rounded-2xl bg-muted p-1 sm:w-auto">
            <TabButton
              active={activeTab === TABS.SHORTLISTED}
              icon={<Bookmark className="h-4 w-4" />}
              label="My Shortlisted Profiles"
              count={shortlistedQuery.data?.pages?.[0]?.pagination?.total}
              testId="shortlist-tab"
              onClick={() => setActiveTab(TABS.SHORTLISTED)}
            />
            <TabButton
              active={activeTab === TABS.LIKED_ME}
              icon={<Heart className="h-4 w-4" />}
              label="People Who Liked Me"
              count={likedMeQuery.data?.pages?.[0]?.pagination?.total}
              testId="liked-me-tab"
              onClick={() => setActiveTab(TABS.LIKED_ME)}
            />
          </div>
        </div>

        <div className="mt-8">
          {activeQuery.isLoading ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-border bg-card shadow-sm">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                <p className="text-sm font-medium">Loading your profiles...</p>
              </div>
            </div>
          ) : activeQuery.isError ? (
            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-10 text-center shadow-sm">
              <h2 className="text-lg font-bold text-rose-900">This list could not load</h2>
              <p className="mt-2 text-sm text-rose-700">
                {activeQuery.error?.message || 'Please try again in a moment.'}
              </p>
              <Button className="mt-5 rounded-xl" onClick={() => activeQuery.refetch()}>
                Try again
              </Button>
            </div>
          ) : isEmpty ? (
            <div className="rounded-3xl border border-border bg-card p-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-amber-700">
                {activeTab === TABS.SHORTLISTED ? (
                  <Bookmark className="h-6 w-6" />
                ) : (
                  <Heart className="h-6 w-6" />
                )}
              </div>
              <h2 className="mt-4 text-xl font-bold text-foreground">
                {activeTab === TABS.SHORTLISTED ? 'No shortlisted profiles yet' : 'No likes yet'}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {activeTab === TABS.SHORTLISTED
                  ? 'Shortlist profiles from discovery to keep them close for later.'
                  : 'When another member likes your profile, they will appear here.'}
              </p>
              <Button
                className="mt-5 rounded-xl bg-amber-400 text-slate-900 dark:text-slate-900 font-bold hover:bg-amber-300"
                onClick={() => navigate('/dashboard/search')}
              >
                Browse discovery
              </Button>
            </div>
          ) : (
            <div
              data-testid={activeTab === TABS.SHORTLISTED ? 'shortlist-grid' : 'liked-me-grid'}
              className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
            >
              {profiles.map(profile => (
                <ProfileCard
                  key={`${activeTab}-${profile.id}-${profile.shortid ?? ''}`}
                  profile={profile}
                  onOpen={openProfile}
                  onRemove={
                    activeTab === TABS.SHORTLISTED
                      ? targetProfile => removeShortlistMutation.mutate(targetProfile.id)
                      : undefined
                  }
                  removePending={
                    activeTab === TABS.SHORTLISTED &&
                    removeShortlistMutation.isPending &&
                    removeShortlistMutation.variables === profile.id
                  }
                />
              ))}
            </div>
          )}
        </div>

        {activeQuery.hasNextPage && (
          <div className="mt-8 flex justify-center pb-4">
            <Button
              type="button"
              data-testid="load-more-profiles"
              variant="outline"
              disabled={activeQuery.isFetchingNextPage}
              onClick={() => activeQuery.fetchNextPage()}
              className="h-10 rounded-full border-border/60 bg-card px-6 text-sm font-medium text-muted-foreground shadow-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeQuery.isFetchingNextPage ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Load More Profiles
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}

export default Shortlist;
