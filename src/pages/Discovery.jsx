import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MapPin, SlidersHorizontal, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ProfileCard } from '@/components/ProfileCard';
import { DiscoverySortSelect } from '@/components/DiscoverySortSelect';
import { PaymentGateBanner } from '@/components/PaymentGateBanner';
import { VerificationGateBanner } from '@/components/VerificationGateBanner';
import { flattenDiscoveryPages, useProfileDiscovery } from '@/hooks/useDiscovery';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { communities } from '@/lib/communities';
import { religions } from '@/lib/religions';
import { openProfileInNewTab } from '@/lib/profileNavigation';

const MIN_RADIUS_KM = 5;
const MAX_RADIUS_KM = 300;

const SELECT_CLASS =
  'h-10 w-full rounded-xl border border-border/60 bg-card px-3 text-sm text-foreground outline-none transition focus:border-amber-400 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground';
const OPTION_CLASS = 'text-foreground bg-card font-medium';

const defaultFilters = {
  radius_km: '100',
  full_city: false,
  location_slot: 'primary',
  age_from: '',
  age_to: '',
  religion: '',
  community: '',
  sort_by: 'last_active',
};

function clampRadius(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsed)) return '100';

  return String(Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, parsed)));
}

function toQueryFilters(values) {
  const fullCity = Boolean(values.full_city);

  return {
    full_city: fullCity,
    search_mode: fullCity ? 'full_city' : undefined,
    location_slot: values.location_slot || 'primary',
    radius_km: fullCity ? undefined : clampRadius(values.radius_km),
    age_from: values.age_from || undefined,
    age_to: values.age_to || undefined,
    religion: values.religion || undefined,
    community: values.community || undefined,
    sort_by: values.sort_by || 'last_active',
  };
}

export function Discovery() {
  const currentUser = useAuthStore(state => state.currentUser);
  const { data: meResponse } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/profiles/me');
      return response.data;
    },
    staleTime: 30_000,
  });
  const account = meResponse?.data?.profile ?? meResponse?.profile ?? currentUser;
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(() => toQueryFilters(defaultFilters));
  const sentinelRef = useRef(null);

  const verificationRequired = Boolean(
    currentUser?.force_verification_required ?? currentUser?.forceverificationrequired,
  );

  const paymentRequired = Boolean(
    currentUser?.payment_enforcement_active ?? currentUser?.paymentenforcementactive,
  );

  const restricted = verificationRequired || paymentRequired;

  const query = useProfileDiscovery(appliedFilters, { enabled: !restricted });
  const profiles = useMemo(() => flattenDiscoveryPages(query.data), [query.data]);
  const communitySearchEnabled = query.data?.pages?.[0]?.features?.community_search_enabled ?? true;
  const locale = query.data?.pages?.[0]?.locale;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const controlsDisabled = query.isFetching;

  const locationOptions = [
    {
      value: 'primary',
      label: `Primary: ${account?.city || 'Not set'}`,
      city: account?.city,
      active: true,
    },
    ...(account?.location_2_active
      ? [
          {
            value: 'location_2',
            label: `Location 2: ${account?.location_2_city || 'Not pinned'}`,
            city: account?.location_2_city,
            active: true,
          },
        ]
      : []),
    ...(account?.location_3_active
      ? [
          {
            value: 'location_3',
            label: `Location 3: ${account?.location_3_city || 'Not pinned'}`,
            city: account?.location_3_city,
            active: true,
          },
        ]
      : []),
  ];

  const selectedLocation =
    locationOptions.find(option => option.value === draftFilters.location_slot) ??
    locationOptions[0];

  useEffect(() => {
    if (query.error?.status !== 429) return;

    toast.error(
      query.error?.message || 'Too many search requests. Please wait a moment before trying again.',
    );
  }, [query.error]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '240px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const applyFilters = event => {
    event.preventDefault();
    setAppliedFilters(toQueryFilters(draftFilters));
  };

  const updateFilter = key => event => {
    setDraftFilters(current => ({ ...current, [key]: event.target.value }));
  };

  const handleSortChange = value => {
    setDraftFilters(current => ({ ...current, sort_by: value }));
    setAppliedFilters(current => ({ ...current, sort_by: value }));
  };

  const toggleFullCity = checked => {
    setDraftFilters(current => ({ ...current, full_city: checked === true }));
  };

  return (
    <main className="min-h-screen bg-background" data-testid="discovery-feed">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-xs sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
              <Sparkles className="h-3.5 w-3.5" />
              Local discovery
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
              Profiles near you
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Opposite-gender matches inside your locale, sorted by your preference.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DiscoverySortSelect
              value={draftFilters.sort_by}
              onChange={handleSortChange}
              disabled={controlsDisabled || restricted || verificationRequired}
            />
            <div className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2 text-sm font-semibold text-amber-900">
              <MapPin className="h-4 w-4" />
              {locale?.search_mode === 'full_city'
                ? `${locale?.city || 'Full City'} · Full City`
                : `${locale?.radius_km ?? 100} km radius`}
            </div>
          </div>
        </div>

        {verificationRequired ? (
          <VerificationGateBanner />
        ) : paymentRequired ? (
          <PaymentGateBanner user={currentUser} />
        ) : null}

        <form
          onSubmit={applyFilters}
          className={`mb-8 grid grid-cols-1 gap-4 rounded-3xl border border-border bg-card p-6 shadow-xs sm:grid-cols-2 lg:grid-cols-6 ${
            restricted || verificationRequired ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          <div className="grid gap-2">
            <Label htmlFor="radius_km">Radius (km)</Label>
            <Input
              id="radius_km"
              type="number"
              min={MIN_RADIUS_KM}
              max={MAX_RADIUS_KM}
              value={draftFilters.radius_km}
              onChange={updateFilter('radius_km')}
              disabled={
                controlsDisabled || restricted || verificationRequired || draftFilters.full_city
              }
              className="disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            />
          </div>

          {locationOptions.length > 1 ? (
            <div className="grid gap-2">
              <Label htmlFor="location_slot">Search location</Label>
              <select
                id="location_slot"
                data-testid="discovery-location-slot"
                value={draftFilters.location_slot}
                onChange={updateFilter('location_slot')}
                disabled={controlsDisabled || restricted || verificationRequired}
                className={SELECT_CLASS}
              >
                {locationOptions.map(option => (
                  <option key={option.value} value={option.value} className={OPTION_CLASS}>
                    {option.label}
                  </option>
                ))}
              </select>
              {draftFilters.location_slot !== 'primary' && !selectedLocation?.city ? (
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Pin this location first.{' '}
                  <Link to="/dashboard/location" className="underline">
                    Open location editor
                  </Link>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="age_from">Age from</Label>
            <Input
              id="age_from"
              type="number"
              min="18"
              max="80"
              value={draftFilters.age_from}
              onChange={updateFilter('age_from')}
              disabled={controlsDisabled || restricted || verificationRequired}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="age_to">Age to</Label>
            <Input
              id="age_to"
              type="number"
              min="18"
              max="80"
              value={draftFilters.age_to}
              onChange={updateFilter('age_to')}
              disabled={controlsDisabled || restricted || verificationRequired}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="religion">Religion</Label>
            <select
              id="religion"
              value={draftFilters.religion}
              onChange={updateFilter('religion')}
              disabled={controlsDisabled || restricted || verificationRequired}
              className={SELECT_CLASS}
            >
              <option value="" className={OPTION_CLASS}>
                Any religion
              </option>
              {religions.map(religion => (
                <option key={religion} value={religion} className={OPTION_CLASS}>
                  {religion}
                </option>
              ))}
            </select>
          </div>

          {communitySearchEnabled ? (
            <div className="grid gap-2">
              <Label htmlFor="community">Community</Label>
              <select
                id="community"
                value={draftFilters.community}
                onChange={updateFilter('community')}
                disabled={controlsDisabled || restricted || verificationRequired}
                className={SELECT_CLASS}
              >
                <option value="" className={OPTION_CLASS}>
                  Any community
                </option>
                {communities.map(community => (
                  <option key={community} value={community} className={OPTION_CLASS}>
                    {community}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex items-end">
            <Button
              type="submit"
              disabled={controlsDisabled || restricted || verificationRequired}
              className="h-10 w-full rounded-xl bg-amber-400 text-slate-900 dark:text-slate-900 font-bold hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Apply
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between lg:col-span-6">
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">Full City search</p>
              <p className="text-sm text-muted-foreground">
                Bypass the km radius and search every profile in{' '}
                {selectedLocation?.city || account?.city || 'your city'}.
              </p>
            </div>
            <Switch
              data-testid="discovery-full-city"
              checked={draftFilters.full_city}
              onCheckedChange={toggleFullCity}
              disabled={controlsDisabled || restricted || verificationRequired}
            />
          </div>
        </form>

        {!restricted ? (
          <>
            {query.isLoading ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              </div>
            ) : query.isError ? (
              <div className="rounded-3xl border border-rose-100 bg-rose-50 p-10 text-center">
                <h2 className="text-lg font-bold text-rose-900">Discovery could not load</h2>
                <p className="mt-2 text-sm text-rose-700">
                  {query.error?.message || 'Please check your location and try again.'}
                </p>
                <Button
                  className="mt-5 rounded-xl"
                  onClick={() => query.refetch()}
                  disabled={query.isFetching || query.error?.status === 429}
                >
                  Try again
                </Button>
              </div>
            ) : profiles.length === 0 ? (
              <div className="rounded-3xl border border-border bg-card p-12 text-center shadow-xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-amber-700">
                  <MapPin className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-xl font-bold">No profiles in this locale yet</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Widen the radius, try Full City, or relax a lifestyle filter to see more members.
                </p>
              </div>
            ) : (
              <div className="relative">
                {restricted ? (
                  <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-background/70 p-6 text-center backdrop-blur-sm">
                    <div className="max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                      <p className="text-sm font-bold text-foreground">Discovery is locked</p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        Account Action Required: Please complete your annual Service Fees payment to
                        unlock your discovery feeds.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div
                  className={`grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 ${
                    restricted ? 'pointer-events-none select-none blur-sm' : ''
                  }`}
                >
                  {profiles.map(profile => (
                    <ProfileCard key={profile.id} profile={profile} onOpen={openProfileInNewTab} />
                  ))}
                </div>
              </div>
            )}

            <div ref={sentinelRef} className="flex min-h-16 items-center justify-center py-8">
              {isFetchingNextPage ? (
                <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
              ) : hasNextPage ? (
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  className="rounded-xl"
                  disabled={restricted || verificationRequired || query.isFetching}
                >
                  Load more profiles
                </Button>
              ) : profiles.length > 0 ? (
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  End of local results
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

export default Discovery;
