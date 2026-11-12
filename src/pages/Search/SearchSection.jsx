import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormik } from 'formik';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, MapPin, Search as SearchIcon, SlidersHorizontal, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProfileCard } from '@/components/ProfileCard';
import { DiscoverySortSelect } from '@/components/DiscoverySortSelect';
import { PaymentGateBanner } from '@/components/PaymentGateBanner';
import { VerificationGateBanner } from '@/components/VerificationGateBanner';
import { flattenDiscoveryPages, useProfileDiscovery } from '@/hooks/useDiscovery';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/api/client';
import { languages } from '@/lib/languages';
import { communities } from '@/lib/communities';
import { openProfileInNewTab } from '@/lib/profileNavigation';

const RELIGIONS = [
  'All',
  'Hindu',
  'Muslim',
  'Christian',
  'Sikh',
  'Parsi',
  'Jain',
  'Buddhist',
  'Other',
];
const ECONOMIC_STATUSES = ['All', 'Below Middleclass', 'Middleclass', 'Above Middleclass'];
const EDUCATION_LEVELS = ['All', 'High School', 'Plus 2 level', 'Bachelors level', 'Masters level'];
const RADIUS_OPTIONS = ['10', '25', '50', '75', '100', '200', '300'];
const MIN_RADIUS_KM = 5;
const MAX_RADIUS_KM = 300;
const SELECT_CLASS =
  'h-10 w-full rounded-xl border border-border/60 bg-card px-3 text-sm text-foreground outline-none transition focus:border-amber-400 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground';
const OPTION_CLASS = 'text-foreground bg-card font-medium';

function clampRadius(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsed)) return '100';

  return String(Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, parsed)));
}

function initialFilters(currentUser) {
  return {
    radius_km: clampRadius(currentUser?.max_search_distance || 100),
    full_city: false,
    location_slot: 'primary',
    age_from: '21',
    age_to: '',
    religion: 'All',
    language: 'All',
    community: 'All',
    economic_status: 'All',
    education_level: 'All',
    job_status: false,
    sort_by: 'last_active',
  };
}

function toQueryFilters(values) {
  const clean = value => (value && value !== 'All' ? value : undefined);
  const fullCity = Boolean(values.full_city);

  return {
    full_city: fullCity,
    search_mode: fullCity ? 'full_city' : undefined,
    location_slot: values.location_slot || 'primary',
    radius_km: fullCity ? undefined : clampRadius(values.radius_km),
    age_from: values.age_from || undefined,
    age_to: values.age_to || undefined,
    religion: clean(values.religion),
    language: clean(values.language),
    community: clean(values.community),
    economic_status: clean(values.economic_status),
    education_level: clean(values.education_level),
    job_status: values.job_status ? true : undefined,
    sort_by: values.sort_by || 'last_active',
  };
}

export function SearchSection() {
  const navigate = useNavigate();
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
  const [appliedFilters, setAppliedFilters] = useState(() =>
    toQueryFilters(initialFilters(currentUser)),
  );
  const sentinelRef = useRef(null);

  const formik = useFormik({
    initialValues: initialFilters(currentUser),
    enableReinitialize: true,
    onSubmit: values => {
      setAppliedFilters(toQueryFilters(values));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  const verificationRequired = Boolean(
    currentUser?.force_verification_required ?? currentUser?.forceverificationrequired,
  );

  const paymentRequired = Boolean(
    currentUser?.payment_enforcement_active ?? currentUser?.paymentenforcementactive,
  );

  const restricted = verificationRequired || paymentRequired;

  const query = useProfileDiscovery(appliedFilters, { enabled: !restricted });
  const profiles = useMemo(() => flattenDiscoveryPages(query.data), [query.data]);
  const total = query.data?.pages?.[0]?.pagination?.total ?? 0;
  const locale = query.data?.pages?.[0]?.locale;
  const communitySearchEnabled = query.data?.pages?.[0]?.features?.community_search_enabled ?? true;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const controlsDisabled = query.isFetching || restricted;
  const fullCity = Boolean(formik.values.full_city);

  const locationOptions = [
    {
      value: 'primary',
      label: `Primary: ${account?.city || 'Not set'}`,
      city: account?.city,
    },
    ...(account?.location_2_active
      ? [
          {
            value: 'location_2',
            label: `Location 2: ${account?.location_2_city || 'Not pinned'}`,
            city: account?.location_2_city,
          },
        ]
      : []),
    ...(account?.location_3_active
      ? [
          {
            value: 'location_3',
            label: `Location 3: ${account?.location_3_city || 'Not pinned'}`,
            city: account?.location_3_city,
          },
        ]
      : []),
  ];

  const selectedLocation =
    locationOptions.find(option => option.value === formik.values.location_slot) ??
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

  const handleSortChange = value => {
    formik.setFieldValue('sort_by', value);
    setAppliedFilters(current => ({ ...current, sort_by: value }));
  };

  return (
    <div className="space-y-6" data-testid="search-section">
      {verificationRequired ? (
        <VerificationGateBanner />
      ) : paymentRequired ? (
        <PaymentGateBanner user={currentUser} />
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-xs">
        <Accordion type="single" collapsible defaultValue="filters">
          <AccordionItem value="filters" className="border-none">
            <AccordionTrigger className="py-2 hover:no-underline">
              <div className="flex items-center gap-2 text-left">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                  <SlidersHorizontal className="h-4 w-4 text-amber-700" />
                </span>
                <div>
                  <p className="text-base font-bold text-foreground">Search preferences</p>
                  <p className="text-xs font-medium text-muted-foreground">
                    Local, lifestyle, and community filters
                  </p>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="pt-4">
              <form onSubmit={formik.handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Religion</Label>
                    <Select
                      value={formik.values.religion}
                      onValueChange={value => formik.setFieldValue('religion', value)}
                      disabled={controlsDisabled}
                    >
                      <SelectTrigger className="w-full rounded-xl">
                        <SelectValue placeholder="Select religion" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {RELIGIONS.map(religion => (
                            <SelectItem key={religion} value={religion}>
                              {religion === 'All' ? 'All Religions' : religion}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select
                      value={formik.values.language}
                      onValueChange={value => formik.setFieldValue('language', value)}
                      disabled={controlsDisabled}
                    >
                      <SelectTrigger className="w-full rounded-xl">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="All">All Languages</SelectItem>
                          {languages.map(language => (
                            <SelectItem key={language} value={language}>
                              {language}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  {communitySearchEnabled ? (
                    <div className="space-y-2">
                      <Label>Community</Label>
                      <Select
                        value={formik.values.community}
                        onValueChange={value => formik.setFieldValue('community', value)}
                        disabled={controlsDisabled}
                      >
                        <SelectTrigger className="w-full rounded-xl">
                          <SelectValue placeholder="Select community" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="All">All Communities</SelectItem>
                            {communities.map(community => (
                              <SelectItem key={community} value={community}>
                                {community}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label>Radius</Label>
                    <Select
                      value={formik.values.radius_km}
                      onValueChange={value => formik.setFieldValue('radius_km', value)}
                      disabled={controlsDisabled || fullCity}
                    >
                      <SelectTrigger className="w-full rounded-xl">
                        <SelectValue placeholder="Select radius" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {RADIUS_OPTIONS.map(distance => (
                            <SelectItem key={distance} value={distance}>
                              {distance} km
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {fullCity ? (
                      <p className="text-xs text-muted-foreground">
                        Radius is disabled while Full City is selected.
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label>Education</Label>
                    <Select
                      value={formik.values.education_level}
                      onValueChange={value => formik.setFieldValue('education_level', value)}
                      disabled={controlsDisabled}
                    >
                      <SelectTrigger className="w-full rounded-xl">
                        <SelectValue placeholder="Select education" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {EDUCATION_LEVELS.map(level => (
                            <SelectItem key={level} value={level}>
                              {level === 'All' ? 'All Levels' : level}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Economic status</Label>
                    <Select
                      value={formik.values.economic_status}
                      onValueChange={value => formik.setFieldValue('economic_status', value)}
                      disabled={controlsDisabled}
                    >
                      <SelectTrigger className="w-full rounded-xl">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {ECONOMIC_STATUSES.map(status => (
                            <SelectItem key={status} value={status}>
                              {status === 'All' ? 'All Statuses' : status}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  {locationOptions.length > 1 ? (
                    <div className="space-y-2">
                      <Label htmlFor="location_slot">Search location</Label>
                      <select
                        id="location_slot"
                        name="location_slot"
                        data-testid="search-section-location-slot"
                        value={formik.values.location_slot}
                        onChange={formik.handleChange}
                        disabled={controlsDisabled}
                        className={SELECT_CLASS}
                      >
                        {locationOptions.map(option => (
                          <option key={option.value} value={option.value} className={OPTION_CLASS}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {formik.values.location_slot !== 'primary' && !selectedLocation?.city ? (
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                          Pin this location first.{' '}
                          <Link to="/dashboard/location" className="underline">
                            Open location editor
                          </Link>
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="age_from">Age from</Label>
                    <Input
                      id="age_from"
                      name="age_from"
                      type="number"
                      min="18"
                      max="80"
                      value={formik.values.age_from}
                      onChange={formik.handleChange}
                      disabled={controlsDisabled}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age_to">Age to</Label>
                    <Input
                      id="age_to"
                      name="age_to"
                      type="number"
                      min="18"
                      max="80"
                      value={formik.values.age_to}
                      onChange={formik.handleChange}
                      disabled={controlsDisabled}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
                    <Checkbox
                      checked={formik.values.job_status}
                      onCheckedChange={checked =>
                        formik.setFieldValue('job_status', Boolean(checked))
                      }
                      disabled={controlsDisabled}
                    />
                    Employed
                  </label>

                  <Button
                    type="submit"
                    disabled={controlsDisabled}
                    className="h-11 rounded-xl bg-amber-400 px-8 text-slate-900 dark:text-slate-900 font-bold shadow-xs hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <SearchIcon className="mr-2 h-4 w-4" />
                    Find Matches
                  </Button>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">Full City search</p>
                    <p className="text-sm text-muted-foreground">
                      Bypass the km radius and search every profile in{' '}
                      {selectedLocation?.city || account?.city || 'your city'}.
                    </p>
                  </div>
                  <Switch
                    data-testid="search-section-full-city"
                    checked={fullCity}
                    onCheckedChange={checked => formik.setFieldValue('full_city', checked === true)}
                    disabled={controlsDisabled}
                  />
                </div>
              </form>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Sparkles className="h-4 w-4 text-amber-600" />
          {query.isLoading ? 'Loading local matches...' : `${total} local matches found`}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DiscoverySortSelect
            value={formik.values.sort_by}
            onChange={handleSortChange}
            disabled={controlsDisabled}
          />
          {locale && (
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-bold text-amber-900">
              <MapPin className="h-3.5 w-3.5" />
              {locale.search_mode === 'full_city'
                ? `${locale.city || 'Full City'} · Full City`
                : `${locale.radius_km} km radius`}
            </div>
          )}
        </div>
      </div>

      {!restricted ? (
        <>
          {query.isLoading ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-border bg-card shadow-xs">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : query.isError ? (
            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-8 text-center shadow-xs">
              <p className="text-lg font-bold text-rose-900">Discovery could not load</p>
              <p className="mt-2 text-sm text-rose-700">
                {query.error?.message || 'Add a location or relax your filters and try again.'}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => query.refetch()}
                  disabled={query.isFetching || query.error?.status === 429}
                >
                  Try again
                </Button>
                <Button
                  className="rounded-xl bg-amber-400 text-slate-900 dark:text-slate-900 font-bold hover:bg-amber-300"
                  onClick={() => navigate('/location')}
                >
                  Update location
                </Button>
              </div>
            </div>
          ) : profiles.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-amber-700">
                <SearchIcon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-foreground">No matches in this locale</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Widen the radius, try Full City, or relax a community filter to see more profiles.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {profiles.map(profile => (
                <ProfileCard key={profile.id} profile={profile} onOpen={openProfileInNewTab} />
              ))}
            </div>
          )}

          <div ref={sentinelRef} className="flex min-h-16 items-center justify-center py-8">
            {isFetchingNextPage ? (
              <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            ) : hasNextPage ? (
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={query.isFetching}
                className="rounded-xl"
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
    </div>
  );
}

export default SearchSection;
