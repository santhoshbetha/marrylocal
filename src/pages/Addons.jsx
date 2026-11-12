import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CreditCard, Loader2, Search, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { states } from '@/lib/states';
import { cities } from '@/lib/cities';

const ADDON_UNIT_PRICE = 100;
const GST_RATE = 0.18;

const ADDON_CATALOG = {
  community_search: {
    label: 'Community Search',
    description: 'Filter discovery by your chosen community and caste preferences.',
  },
  location2: {
    label: 'Secondary Location',
    description: 'Add a second city or nearby locale to your discovery matrix.',
  },
  location3: {
    label: 'Tertiary Location',
    description: 'Add a third city or nearby locale to your discovery matrix.',
  },
};

const initialSelections = {
  community_search: false,
  location2: false,
  location3: false,
};

const initialLocationForms = {
  location2: { state: '', city: '' },
  location3: { state: '', city: '' },
};

function isActiveAddon(profile, key) {
  const addons = profile?.addons || {};

  if (key === 'community_search') {
    return Boolean(profile?.community_search_active || addons.communitySearch);
  }
  if (key === 'location2') {
    return Boolean(profile?.multi_location_slots?.location2?.city || addons?.location2?.city2);
  }
  if (key === 'location3') {
    return Boolean(profile?.multi_location_slots?.location3?.city || addons?.location3?.city3);
  }

  return false;
}

function formatInr(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function AddonPrice() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
      <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
        {formatInr(ADDON_UNIT_PRICE)} base
      </span>
      <span className="rounded-full bg-accent px-2.5 py-1 text-accent-foreground">+18% GST</span>
      <span className="text-muted-foreground">Final amount verified by the server</span>
    </div>
  );
}

function AddonCard({ addonKey, active, children }) {
  const addon = ADDON_CATALOG[addonKey];

  return (
    <article className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm transition-transform duration-200 hover:scale-[1.01]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">{addon.label}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{addon.description}</p>
        </div>
        {active ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
            <Check className="h-3 w-3" />
            Active
          </span>
        ) : null}
      </div>

      <AddonPrice />
      <div className="mt-5">{children}</div>
    </article>
  );
}

function Addons() {
  const { currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [selections, setSelections] = useState(initialSelections);
  const [locationForms, setLocationForms] = useState(initialLocationForms);

  const {
    data: profileResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/profiles/me');
      return response.data;
    },
    staleTime: 30_000,
  });

  const profile =
    profileResponse?.data?.profile ??
    profileResponse?.profile ??
    profileResponse ??
    currentUser ??
    {};

  const communitySearchEnabled = profile?.community_search_enabled !== false;

  const statesOptions = useMemo(() => states.filter(Boolean), []);

  const cityOptions = key =>
    cities
      .filter(city => city.state === locationForms[key].state)
      .filter(city => city.name !== profile?.city)
      .map(city => city.name);

  const initializeCheckout = useMutation({
    mutationFn: async selectedItems => {
      const response = await apiClient.post('/api/v1/payments/initialize-checkout', {
        items: selectedItems,
      });
      return response.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });

      const redirectUrl =
        data?.data?.redirect_url ??
        data?.data?.checkout_url ??
        data?.redirect_url ??
        data?.checkout_url;

      if (redirectUrl) {
        window.location.assign(redirectUrl);
        return;
      }

      toast.error('The secure checkout session did not return a payment URL.');
    },
    onError: error => {
      toast.error(
        error?.payload?.message ||
          error?.response?.data?.message ||
          error?.message ||
          'Unable to initialize checkout.',
      );
    },
  });

  const setSelection = (key, value) => {
    setSelections(current => ({ ...current, [key]: value }));
  };

  const updateLocationForm = (key, field, value) => {
    setLocationForms(current => ({
      ...current,
      [key]: {
        ...current[key],
        [field]: value,
        ...(field === 'state' ? { city: '' } : {}),
      },
    }));
  };

  const addLocation = key => {
    const form = locationForms[key];

    if (!form.state) {
      toast.error('Select a state first.');
      return;
    }

    if (!form.city) {
      toast.error('Select a city first.');
      return;
    }

    setSelection(key, true);
  };

  const removeLocation = key => {
    setSelection(key, false);
    setLocationForms(current => ({
      ...current,
      [key]: { state: '', city: '' },
    }));
  };

  const activeCommunity = isActiveAddon(profile, 'community_search');
  const activeLocation2 = isActiveAddon(profile, 'location2');
  const activeLocation3 = isActiveAddon(profile, 'location3');

  const selectedItems = useMemo(
    () => ({
      community_search: communitySearchEnabled && selections.community_search && !activeCommunity,
      location2:
        selections.location2 && !activeLocation2
          ? {
              state: locationForms.location2.state,
              city: locationForms.location2.city,
            }
          : null,
      location3:
        selections.location3 && !activeLocation3
          ? {
              state: locationForms.location3.state,
              city: locationForms.location3.city,
            }
          : null,
    }),
    [
      activeCommunity,
      activeLocation2,
      activeLocation3,
      communitySearchEnabled,
      locationForms,
      selections,
    ],
  );

  const selectedCount = [
    selectedItems.community_search,
    selectedItems.location2,
    selectedItems.location3,
  ].filter(Boolean).length;

  const subtotal = selectedCount * ADDON_UNIT_PRICE;
  const gst = Math.round(subtotal * GST_RATE);
  const total = subtotal + gst;
  const hasSelection = selectedCount > 0;

  const initiateCheckout = () => {
    if (!hasSelection) {
      toast.error('Select at least one addon first.');
      return;
    }

    initializeCheckout.mutate(selectedItems);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-border/60 bg-card p-8 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading your addons...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-3xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
          <p className="text-lg font-bold text-destructive">Addons could not load</p>
          <p className="mt-2 text-sm text-destructive/90">
            {error?.message || 'Please try again in a moment.'}
          </p>
          <Button className="mt-5 rounded-xl" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">Addons</h1>
              <p className="text-sm text-muted-foreground">
                Expand discovery by community and additional locales.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5" />
            Server-priced checkout
          </span>
        </div>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {communitySearchEnabled ? (
            <AddonCard addonKey="community_search" active={activeCommunity}>
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-muted/40 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Search className="h-4 w-4 text-primary" />
                  {activeCommunity
                    ? 'Already active on your profile'
                    : selections.community_search
                      ? 'Selected for checkout'
                      : 'Add community filtering'}
                </div>
                <Switch
                  checked={activeCommunity || selections.community_search}
                  disabled={activeCommunity}
                  onCheckedChange={value => setSelection('community_search', value)}
                />
              </div>
            </AddonCard>
          ) : null}

          {['location2', 'location3'].map(key => {
            const active = key === 'location2' ? activeLocation2 : activeLocation3;
            const selected = selections[key];
            const form = locationForms[key];

            return (
              <AddonCard key={key} addonKey={key} active={active}>
                {active || selected ? (
                  <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
                    <p className="text-sm font-bold text-foreground">
                      {active ? 'Active location' : 'Selected for checkout'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {active
                        ? key === 'location2'
                          ? `${profile?.multi_location_slots?.location2?.city || profile?.addons?.location2?.city2 || ''}, ${profile?.multi_location_slots?.location2?.state || profile?.addons?.location2?.state2 || ''}`
                          : `${profile?.multi_location_slots?.location3?.city || profile?.addons?.location3?.city3 || ''}, ${profile?.multi_location_slots?.location3?.state || profile?.addons?.location3?.state3 || ''}`
                        : `${form.city}, ${form.state}`}
                    </p>
                    {!active ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeLocation(key)}
                        className="mt-4 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>State</Label>
                      <Select
                        value={form.state}
                        onValueChange={value => updateLocationForm(key, 'state', value)}
                      >
                        <SelectTrigger className="w-full rounded-xl">
                          <SelectValue placeholder="Choose state" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {statesOptions.map(state => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>City</Label>
                      <Select
                        value={form.city}
                        onValueChange={value => updateLocationForm(key, 'city', value)}
                        disabled={!form.state}
                      >
                        <SelectTrigger className="w-full rounded-xl">
                          <SelectValue
                            placeholder={form.state ? 'Choose city' : 'Choose state first'}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {cityOptions(key).map(city => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      onClick={() => addLocation(key)}
                      className="rounded-xl bg-amber-400 px-5 text-slate-900 font-bold hover:bg-amber-300"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                  </div>
                )}
              </AddonCard>
            );
          })}
        </section>

        <Separator className="bg-border/60" />

        <section className="flex flex-col gap-5 rounded-3xl border border-border/60 bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full space-y-2 sm:max-w-sm">
            <p className="text-sm font-bold text-foreground">Checkout summary</p>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {selectedCount} selected addon{selectedCount === 1 ? '' : 's'}
              </span>
              <span>{formatInr(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>GST at 18%</span>
              <span>{formatInr(gst)}</span>
            </div>
            <div className="flex justify-between border-t border-border/60 pt-2 text-base font-bold text-foreground">
              <span>Grand total</span>
              <span>{formatInr(total)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              The server recalculates every amount before payment.
            </p>
          </div>

          <Button
            type="button"
            onClick={initiateCheckout}
            disabled={!hasSelection || initializeCheckout.isPending}
            className="rounded-xl bg-amber-400 px-8 text-slate-900 font-bold shadow-xs hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            {initializeCheckout.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            PAY {hasSelection ? formatInr(total) : ''}
          </Button>
        </section>
      </div>
    </div>
  );
}

export default Addons;
