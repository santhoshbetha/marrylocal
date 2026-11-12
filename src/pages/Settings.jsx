import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AtSign,
  Ban,
  Briefcase,
  Check,
  Clock3,
  CreditCard,
  Loader2,
  Mail,
  MapPin,
  Palette,
  Phone,
  Receipt,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  Share2,
  Shield,
  ShieldAlert,
  Users,
  VolumeX,
  X,
} from 'lucide-react';
import { FaFacebook, FaInstagram } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { readDarkVariant, setDarkVariantPreference } from '@/lib/theme';
import { cities } from '@/lib/cities';
import { coords } from '@/lib/defaultcoords';

const PRIVACY_TOGGLES = [
  {
    key: 'hide_last_name',
    label: 'Hide Last Name From Public Profiles',
    icon: Shield,
    visible: 'Only your first name and last initial are shown',
    hidden: 'Your full last name is visible to members',
  },
  {
    key: 'show_phone',
    label: 'Phone Number',
    icon: Phone,
    visible: 'Visible to matched members',
    hidden: 'Hidden from other members',
  },
  {
    key: 'show_facebook',
    label: 'Facebook Profile',
    icon: Share2,
    visible: 'Facebook link is visible',
    hidden: 'Facebook link is hidden',
  },
  {
    key: 'show_instagram',
    label: 'Instagram Profile',
    icon: Share2,
    visible: 'Instagram link is visible',
    hidden: 'Instagram link is hidden',
  },
  {
    key: 'show_community',
    label: 'Community Information',
    icon: Users,
    visible: 'Community is shown on your profile',
    hidden: 'Community is private',
  },
  {
    key: 'show_in_other_religion_people_search',
    label: 'Cross-Religion Search',
    icon: Search,
    visible: 'You appear in other religion searches',
    hidden: 'You only appear in same-religion searches',
  },
];

const LOOKUP_PRIVACY_TOGGLES = [
  {
    key: 'restrict_lookup_to_200km',
    title: 'Only show your profile to people within 200 kms',
    description:
      'When enabled, people outside a 200 km radius of your location cannot find you via direct lookup.',
    icon: MapPin,
    defaultEnabled: true,
  },
  {
    key: 'allow_email_search',
    title: 'Email Search Visibility',
    description:
      'Allow other users to find your profile when searching by your exact email address.',
    icon: Mail,
    defaultEnabled: false,
  },
  {
    key: 'allow_phone_search',
    title: 'Phone Search Visibility',
    description:
      'Allow other users to find your profile when searching by your 10-digit phone number.',
    icon: Phone,
    defaultEnabled: false,
  },
  {
    key: 'allow_handle_search',
    title: 'UserHandle Search Visibility',
    description: 'Allow other users to find your profile when searching by your @handle.',
    icon: AtSign,
    defaultEnabled: true,
  },
];

const HANDLE_PATTERN = /^[A-Za-z][A-Za-z0-9_]{4,14}$/;
const SOCIAL_URL_PATTERN = /^(https?:\/\/|www\.)\S+$/i;
const SOCIAL_HANDLE_PATTERN = /^@?[A-Za-z0-9._-]{1,50}$/;

function normalizeHandle(value) {
  return String(value ?? '')
    .trim()
    .replace(/^@+/, '');
}

function normalizePhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function isValidSocialValue(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return true;

  return SOCIAL_URL_PATTERN.test(trimmed) || SOCIAL_HANDLE_PATTERN.test(trimmed);
}

const profileDetailsSchema = Yup.object({
  user_handle: Yup.string()
    .trim()
    .matches(
      HANDLE_PATTERN,
      'Handles must be 5-15 characters, start with a letter, and use only letters, numbers, or underscores.',
    )
    .required('A public handle is required'),
  phone_number: Yup.string()
    .trim()
    .matches(/^\d{10}$/, {
      message: 'Enter a 10-digit phone number or leave it empty.',
      excludeEmptyString: true,
    }),
  instagram: Yup.string()
    .trim()
    .test('instagram', 'Enter a valid URL or handle, or leave it empty.', value =>
      isValidSocialValue(value),
    ),
  facebook: Yup.string()
    .trim()
    .test('facebook', 'Enter a valid URL or handle, or leave it empty.', value =>
      isValidSocialValue(value),
    ),
});

function FieldError({ formik, name }) {
  if (!formik.touched[name] || !formik.errors[name]) return null;

  return <p className="text-sm font-medium text-destructive">{formik.errors[name]}</p>;
}

function readableDate(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date);
}

function daysUntil(value) {
  if (!value) return 0;

  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return 0;

  return Math.max(0, Math.ceil((target - Date.now()) / 86_400_000));
}

function patchProfileResponse(data, patch) {
  if (!data) return data;

  const profile = data?.data?.profile ?? data?.profile;
  if (!profile) return data;

  const updatedProfile = { ...profile, ...patch };

  if (data?.data?.profile) {
    return { ...data, data: { ...data.data, profile: updatedProfile } };
  }

  if (data?.profile) {
    return { ...data, profile: updatedProfile };
  }

  return updatedProfile;
}

function profileInitials(profile) {
  const first = profile?.first_name || profile?.firstname || '';
  const last = profile?.last_name || profile?.lastname || '';
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || 'ML';
}

function profileName(profile) {
  const name = [profile?.first_name || profile?.firstname, profile?.last_name || profile?.lastname]
    .filter(Boolean)
    .join(' ');
  return name || profile?.user_handle || 'Member';
}

function formatInr(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function normalizeLocationPair(state, city) {
  const normalizedState = String(state || '')
    .trim()
    .toLowerCase();
  const normalizedCity = String(city || '')
    .trim()
    .toLowerCase();

  return normalizedState && normalizedCity ? `${normalizedState}|${normalizedCity}` : null;
}

function activeSettingsLocationPairs(profile, excludeKey) {
  const pairs = [];

  if (excludeKey !== 'primary' && profile?.state && profile?.city) {
    pairs.push({
      key: 'primary',
      label: 'Primary Location',
      state: profile.state,
      city: profile.city,
    });
  }

  if (
    excludeKey !== 'location_2' &&
    profile?.location_2_active &&
    profile?.location_2_state &&
    profile?.location_2_city
  ) {
    pairs.push({
      key: 'location_2',
      label: 'Location 2',
      state: profile.location_2_state,
      city: profile.location_2_city,
    });
  }

  if (
    excludeKey !== 'location_3' &&
    profile?.location_3_active &&
    profile?.location_3_state &&
    profile?.location_3_city
  ) {
    pairs.push({
      key: 'location_3',
      label: 'Location 3',
      state: profile.location_3_state,
      city: profile.location_3_city,
    });
  }

  return pairs;
}

function duplicateSettingsLocation(profile, slotKey, state, city) {
  const target = normalizeLocationPair(state, city);
  if (!target) return null;

  return (
    activeSettingsLocationPairs(profile, slotKey).find(
      pair => normalizeLocationPair(pair.state, pair.city) === target,
    ) ?? null
  );
}

function SecondaryLocationCard({ profile, slotKey, label }) {
  const queryClient = useQueryClient();
  const { updateProfile } = useAuthStore();
  const city = profile?.[`${slotKey}_city`] || '';
  const state = profile?.[`${slotKey}_state`] || '';
  const locked = Boolean(profile?.[`${slotKey}_change_locked`]);
  const expiresAt = profile?.[`${slotKey}_expires_at`];
  const allowChangeAt = profile?.[`${slotKey}_allow_change_at`];
  const [selectedState, setSelectedState] = useState(state);
  const [selectedCity, setSelectedCity] = useState(city);

  useEffect(() => {
    setSelectedState(state);
    setSelectedCity(city);
  }, [state, city]);

  const states = useMemo(
    () => [...new Set(cities.map(item => item.state))].filter(Boolean).sort(),
    [],
  );
  const cityOptions = useMemo(
    () =>
      cities
        .filter(item => item.state === selectedState)
        .map(item => {
          const conflict = duplicateSettingsLocation(profile, slotKey, item.state, item.name);

          return {
            name: item.name,
            disabled: Boolean(conflict),
            reason: conflict ? `(Already ${conflict.label})` : null,
          };
        }),
    [profile, selectedState, slotKey],
  );

  const selectedConflict = duplicateSettingsLocation(profile, slotKey, selectedState, selectedCity);

  const mutation = useMutation({
    mutationFn: payload => apiClient.patch('/api/v1/profiles/me/location', payload),
    onSuccess: response => {
      const updated = response.data?.data?.profile ?? response.data?.profile;
      if (updated) updateProfile(updated);
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      toast.success(`${label} updated`);
    },
    onError: error => {
      toast.error(
        error?.response?.data?.message ||
          error?.payload?.message ||
          error?.message ||
          `Unable to update ${label}.`,
      );
    },
  });

  const save = event => {
    event.preventDefault();

    if (locked) {
      toast.error('This location can only be changed once every 30 days.');
      return;
    }

    if (!selectedState || !selectedCity) {
      toast.error('Select a state and city first.');
      return;
    }

    if (selectedConflict) {
      toast.error(`That city is already assigned to ${selectedConflict.label}.`);
      return;
    }

    const coordinates = coords.find(item => item.city === selectedCity)?.coords;

    if (!coordinates) {
      toast.error('City coordinates are unavailable.');
      return;
    }

    mutation.mutate({
      slot: slotKey,
      state: selectedState,
      city: selectedCity,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
    });
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {city || 'Not set'}
            {state ? `, ${state}` : ''}
          </p>
          {expiresAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Subscription expires {readableDate(expiresAt)}
            </p>
          ) : null}
        </div>
        <span
          className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
            locked
              ? 'bg-accent text-accent-foreground'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          }`}
        >
          <Clock3 className="h-3 w-3" />
          {locked
            ? `Locked until ${readableDate(allowChangeAt) || 'cooldown ends'}`
            : 'Eligible to change'}
        </span>
      </div>

      <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2">
        <Select
          value={selectedState}
          onValueChange={value => {
            setSelectedState(value);
            setSelectedCity('');
          }}
          disabled={locked}
        >
          <SelectTrigger className="w-full rounded-xl">
            <SelectValue placeholder="Choose state" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {states.map(item => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          value={selectedCity}
          onValueChange={setSelectedCity}
          disabled={locked || !selectedState}
        >
          <SelectTrigger className="w-full rounded-xl">
            <SelectValue placeholder={selectedState ? 'Choose city' : 'Choose state first'} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {cityOptions.map(item => (
                <SelectItem key={item.name} value={item.name} disabled={item.disabled}>
                  {item.name}
                  {item.reason ? ` ${item.reason}` : ''}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {selectedConflict ? (
          <p className="text-xs font-medium text-destructive sm:col-span-2">
            This city is already assigned to {selectedConflict.label}.
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={
            locked ||
            mutation.isPending ||
            !selectedState ||
            !selectedCity ||
            Boolean(selectedConflict)
          }
          className="rounded-xl bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90 sm:col-span-2"
        >
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Update {label}
        </Button>
      </form>
    </div>
  );
}

function Settings() {
  const { currentUser, updateProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const [locationOpen, setLocationOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [darkVariant, setDarkVariant] = useState(readDarkVariant);

  const handleVariantChange = chosenValue => {
    const next = setDarkVariantPreference(chosenValue);

    setDarkVariant(next);
    queryClient.invalidateQueries();
    toast.success('Color scheme theme updated successfully!');
  };

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

  const employed = Boolean(profile?.job_status);
  const currentHandle = normalizeHandle(profile?.user_handle ?? profile?.userhandle ?? '');
  const [debouncedHandle, setDebouncedHandle] = useState(currentHandle);

  const profileDetailsFormik = useFormik({
    initialValues: {
      user_handle: currentHandle,
      phone_number: normalizePhone(profile?.phone_number ?? profile?.phonenumber ?? ''),
      instagram: profile?.instagram ?? '',
      facebook: profile?.facebook ?? '',
    },
    enableReinitialize: true,
    validationSchema: profileDetailsSchema,
    onSubmit: () => {},
  });

  useEffect(() => {
    const normalized = normalizeHandle(profileDetailsFormik.values.user_handle);
    const timer = window.setTimeout(() => setDebouncedHandle(normalized), 400);

    return () => window.clearTimeout(timer);
  }, [profileDetailsFormik.values.user_handle]);

  const handleCheckQuery = useQuery({
    queryKey: ['checkHandle', debouncedHandle.toLowerCase()],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/auth/check-handle', {
        params: { handle: debouncedHandle },
      });

      return response.data;
    },
    enabled:
      debouncedHandle.length >= 3 &&
      HANDLE_PATTERN.test(debouncedHandle) &&
      debouncedHandle.toLowerCase() !== currentHandle.toLowerCase(),
    staleTime: 30_000,
    retry: false,
  });

  const normalizedHandleInput = normalizeHandle(profileDetailsFormik.values.user_handle);
  const handleFormatValid = HANDLE_PATTERN.test(normalizedHandleInput);
  const handleUnchanged =
    normalizedHandleInput !== '' &&
    normalizedHandleInput.toLowerCase() === currentHandle.toLowerCase();
  const handleStatusFresh = debouncedHandle.toLowerCase() === normalizedHandleInput.toLowerCase();
  const handlePendingVerification =
    handleFormatValid && !handleUnchanged && (handleCheckQuery.isFetching || !handleStatusFresh);
  const handleTaken =
    handleFormatValid &&
    !handleUnchanged &&
    handleStatusFresh &&
    handleCheckQuery.data?.available === false;
  const handleAvailable =
    handleFormatValid &&
    !handleUnchanged &&
    handleStatusFresh &&
    handleCheckQuery.data?.available === true;

  const profileDetailsMutation = useMutation({
    mutationFn: async payload => apiClient.patch('/api/v1/profiles/me', payload),
    onSuccess: response => {
      const updatedProfile =
        response.data?.data?.profile ?? response.data?.profile ?? response.data;

      if (updatedProfile) {
        updateProfile(updatedProfile);
        profileDetailsFormik.resetForm({
          values: {
            user_handle: normalizeHandle(
              updatedProfile.user_handle ?? updatedProfile.userhandle ?? '',
            ),
            phone_number: normalizePhone(
              updatedProfile.phone_number ?? updatedProfile.phonenumber ?? '',
            ),
            instagram: updatedProfile.instagram ?? '',
            facebook: updatedProfile.facebook ?? '',
          },
        });
        setDebouncedHandle(
          normalizeHandle(updatedProfile.user_handle ?? updatedProfile.userhandle ?? ''),
        );
      }

      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      toast.success('Profile details updated successfully!');
    },
    onError: error => {
      toast.error(
        error?.response?.data?.message ||
          error?.payload?.message ||
          error?.message ||
          'Could not update your profile details',
      );
    },
  });

  const handleProfileDetailsSubmit = async event => {
    event.preventDefault();

    const errors = await profileDetailsFormik.validateForm();
    profileDetailsFormik.setTouched({
      user_handle: true,
      phone_number: true,
      instagram: true,
      facebook: true,
    });

    if (Object.keys(errors).length > 0) return;

    const values = profileDetailsFormik.values;
    const nextHandle = normalizeHandle(values.user_handle);
    const handleChanged = nextHandle.toLowerCase() !== currentHandle.toLowerCase();

    if (handleChanged) {
      if (handleCheckQuery.isError) {
        toast.error('Could not verify handle availability. Please try again.');
        return;
      }

      if (handleCheckQuery.isFetching || !handleStatusFresh || !handleCheckQuery.data) {
        toast.message('Checking handle availability. Try again in a moment.');
        return;
      }

      if (handleCheckQuery.data.available !== true) {
        toast.error(handleCheckQuery.data.message || 'This handle is already taken.');
        return;
      }
    }

    profileDetailsMutation.mutate({
      user_handle: nextHandle,
      phone_number: values.phone_number.trim(),
      instagram: values.instagram.trim(),
      facebook: values.facebook.trim(),
    });
  };

  const updateLocationMutation = useMutation({
    mutationFn: async payload => apiClient.patch('/api/v1/profiles/me/location', payload),
    onSuccess: response => {
      const updatedProfile =
        response.data?.data?.profile ?? response.data?.profile ?? response.data;
      if (updatedProfile) updateProfile(updatedProfile);
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      toast.success('Location updated successfully!');
    },
    onError: error => {
      toast.error(
        error?.response?.data?.message ||
          error?.payload?.message ||
          error?.message ||
          'Unable to update your location.',
      );
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async updatedPayload => apiClient.patch('/api/v1/profiles/me', updatedPayload),
    onSuccess: response => {
      const updatedProfile =
        response.data?.data?.profile ?? response.data?.profile ?? response.data;

      updateProfile(updatedProfile);
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      toast.success('Settings updated successfully!');
    },
    onError: error => {
      toast.error(
        error?.response?.data?.message ||
          error?.payload?.message ||
          error?.message ||
          'Update failed',
      );
    },
  });

  const lookupPrivacyMutation = useMutation({
    mutationFn: async payload => apiClient.patch('/api/v1/profiles/me', payload),
    onMutate: async payload => {
      await queryClient.cancelQueries({ queryKey: ['profile', 'me'] });

      const previousProfileResponse = queryClient.getQueryData(['profile', 'me']);
      const previousUser = useAuthStore.getState().currentUser;

      queryClient.setQueryData(['profile', 'me'], current =>
        patchProfileResponse(current, payload),
      );
      updateProfile(payload);

      return { previousProfileResponse, previousUser };
    },
    onSuccess: response => {
      const updatedProfile =
        response.data?.data?.profile ?? response.data?.profile ?? response.data;

      if (updatedProfile) updateProfile(updatedProfile);
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      toast.success('Privacy setting updated');
    },
    onError: (error, _payload, context) => {
      if (context?.previousProfileResponse !== undefined) {
        queryClient.setQueryData(['profile', 'me'], context.previousProfileResponse);
      }
      if (context?.previousUser) updateProfile(context.previousUser);

      toast.error(
        error?.response?.data?.message ||
          error?.payload?.message ||
          error?.message ||
          'Could not update that privacy setting',
      );
    },
  });

  const moderatedQuery = useQuery({
    queryKey: ['relationships', 'moderated'],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get('/api/v1/relationships/moderated', { signal });
      const data = response.data?.data ?? response.data ?? {};
      return {
        blocked: Array.isArray(data.blocked) ? data.blocked : [],
        muted: Array.isArray(data.muted) ? data.muted : [],
      };
    },
    staleTime: 15_000,
  });

  const restoreModerationMutation = useMutation({
    mutationFn: async ({ kind, targetId }) =>
      apiClient.delete(`/api/v1/relationships/${kind}/${targetId}`),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['relationships', 'moderated'] });
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      toast.success(variables.kind === 'block' ? 'Profile unblocked.' : 'Profile unmuted.');
    },
    onError: (error, variables) => {
      toast.error(
        error?.response?.data?.message ||
          error?.payload?.message ||
          error?.message ||
          `Could not ${variables.kind === 'block' ? 'unblock' : 'unmute'} that profile.`,
      );
    },
  });

  const { data: billingResponse, isLoading: billingLoading } = useQuery({
    queryKey: ['payments', 'transactions'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/payments/transactions');
      return response.data?.data ?? response.data;
    },
    staleTime: 30_000,
  });

  const billingTransactions = billingResponse?.transactions ?? [];

  const { data: invoicesResponse, isLoading: invoicesLoading } = useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: async () => {
      const token = window.localStorage.getItem('marrylocal.auth.token');
      const response = await window.fetch('/api/v1/billing/invoices', {
        headers: token ? { authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });

      if (!response.ok) return { invoices: [] };
      const payload = await response.json();
      return payload?.data ?? payload;
    },
    staleTime: 30_000,
  });

  const invoices = invoicesResponse?.invoices ?? [];

  const states = useMemo(
    () => [...new Set(cities.map(city => city.state))].filter(Boolean).sort(),
    [],
  );

  const cityOptions = useMemo(
    () =>
      cities
        .filter(city => city.state === selectedState)
        .map(city => {
          const conflict = duplicateSettingsLocation(profile, 'primary', city.state, city.name);

          return {
            name: city.name,
            disabled: Boolean(conflict),
            reason: conflict ? `(Already ${conflict.label})` : null,
          };
        }),
    [profile, selectedState],
  );

  const primarySelectedConflict = duplicateSettingsLocation(
    profile,
    'primary',
    selectedState,
    selectedCity,
  );

  const coordinates = useMemo(
    () => coords.find(item => item.city === selectedCity)?.coords ?? null,
    [selectedCity],
  );

  const allowLocationChangeAt = profile?.allow_location_change_at;
  const locationLocked =
    typeof profile?.location_change_locked === 'boolean'
      ? profile.location_change_locked
      : Boolean(allowLocationChangeAt && new Date(allowLocationChangeAt).getTime() > Date.now());

  const lastLocationChange = readableDate(profile?.date_of_location);
  const nextLocationChange = readableDate(allowLocationChangeAt);
  const cooldownDays = daysUntil(allowLocationChangeAt);

  const handleLocationSubmit = event => {
    event.preventDefault();

    if (locationLocked) {
      toast.error('Your location cooldown is still active.');
      return;
    }

    if (!selectedState || !selectedCity || !coordinates) {
      toast.error('Select a valid state and city first.');
      return;
    }

    if (primarySelectedConflict) {
      toast.error(`That city is already assigned to ${primarySelectedConflict.label}.`);
      return;
    }

    updateLocationMutation.mutate(
      {
        slot: 'primary',
        state: selectedState,
        city: selectedCity,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
      },
      {
        onSuccess: () => {
          setLocationOpen(false);
          setSelectedState('');
          setSelectedCity('');
        },
      },
    );
  };

  const clearCache = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      toast.success('Cache cleared. Refresh the page to finish.');
      return;
    }

    toast.error('Service worker is not available.');
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-background px-4">
        <div className="bg-card border border-border rounded-3xl p-8 shadow-xs flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading your settings...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-background px-4">
        <div className="bg-card border border-destructive/30 rounded-3xl p-8 shadow-xs text-center max-w-md">
          <p className="text-lg font-bold text-destructive">Settings could not load</p>
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
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-4 bg-card border border-border rounded-3xl p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <SettingsIcon className="h-6 w-6 text-primary" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Privacy, locale, and account preferences save directly to your profile.
              </p>
            </div>
          </div>

          {updateSettingsMutation.isPending && (
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving
            </span>
          )}
        </div>

        <section className="bg-card border border-border rounded-3xl p-6 shadow-xs">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Privacy settings</h2>
              <p className="text-sm text-muted-foreground">
                Toggles update your server profile immediately.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {PRIVACY_TOGGLES.map(item => {
              const Icon = item.icon;
              const enabled =
                item.key === 'hide_last_name'
                  ? profile?.hide_last_name || false
                  : Boolean(profile?.[item.key]);

              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-muted/40 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <Icon className="h-5 w-5 text-primary" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {enabled ? item.visible : item.hidden}
                      </p>
                    </div>
                  </div>

                  <Switch
                    data-testid={`settings-toggle-${item.key}`}
                    checked={enabled}
                    disabled={updateSettingsMutation.isPending}
                    onCheckedChange={value => updateSettingsMutation.mutate({ [item.key]: value })}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-muted/40 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Palette className="h-5 w-5 text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">Application Color Accent</p>
                <p className="text-sm text-muted-foreground">
                  Choose the dark palette used across cards, navigation, and controls.
                </p>

                <Select value={darkVariant} onValueChange={handleVariantChange}>
                  <SelectTrigger
                    data-testid="app-variant-trigger"
                    className="mt-3 h-11 w-full rounded-xl border-border/60 bg-background"
                  >
                    <SelectValue placeholder="Select a dark palette" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amber">Warm Gold / Amber (Default Dark)</SelectItem>
                    <SelectItem value="teal">Classic Teal (Green Dark)</SelectItem>
                  </SelectContent>
                </Select>

                <p className="mt-2 text-xs text-muted-foreground">
                  Applied whenever dark mode is active.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-card border border-border rounded-3xl p-6 shadow-xs">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Search className="h-5 w-5 text-primary" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Search &amp; Lookup Privacy</h2>
              <p className="text-sm text-muted-foreground">
                Control how members can find you through direct profile lookup.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {LOOKUP_PRIVACY_TOGGLES.map(item => {
              const Icon = item.icon;
              const enabled = profile?.[item.key] ?? item.defaultEnabled;

              return (
                <div
                  key={item.key}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-border/60 bg-muted/40 p-4"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <Icon className="h-5 w-5 text-primary" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <Switch
                    data-testid={`settings-lookup-toggle-${item.key}`}
                    checked={Boolean(enabled)}
                    disabled={lookupPrivacyMutation.isPending}
                    onCheckedChange={value => lookupPrivacyMutation.mutate({ [item.key]: value })}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-card border border-border rounded-3xl p-6 shadow-xs">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Profile details</h2>
              <p className="text-sm text-muted-foreground">
                Public handle, contact details, and employment context shown on your profile.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-muted/40 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Briefcase className="h-5 w-5 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">Job Status</p>
                <p className="text-sm text-muted-foreground">
                  {employed
                    ? 'Currently employed — this is shown on your profile.'
                    : 'Not currently employed — update this anytime.'}
                </p>
              </div>
            </div>

            <Switch
              data-testid="settings-job-status"
              checked={employed}
              disabled={updateSettingsMutation.isPending}
              onCheckedChange={value => updateSettingsMutation.mutate({ job_status: value })}
            />
          </div>

          <form
            onSubmit={handleProfileDetailsSubmit}
            data-testid="profile-details-form"
            className="mt-5 space-y-4 border-t border-border/60 pt-5"
            noValidate
          >
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="user_handle">
                User handle
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                  @
                </span>
                <Input
                  id="user_handle"
                  name="user_handle"
                  data-testid="handle-input"
                  autoComplete="off"
                  spellCheck="false"
                  placeholder="your_handle"
                  value={profileDetailsFormik.values.user_handle}
                  onChange={event => {
                    profileDetailsFormik.setFieldValue(
                      'user_handle',
                      event.target.value.replace(/^@+/, ''),
                    );
                  }}
                  onBlur={profileDetailsFormik.handleBlur}
                  aria-invalid={Boolean(
                    profileDetailsFormik.touched.user_handle &&
                      profileDetailsFormik.errors.user_handle,
                  )}
                  className="h-11 rounded-xl border-border/60 bg-background pl-8"
                />
              </div>
              <FieldError formik={profileDetailsFormik} name="user_handle" />

              <div aria-live="polite" className="min-h-5 text-xs font-medium">
                {handleUnchanged && (
                  <span className="text-muted-foreground">This is your current handle.</span>
                )}
                {!handleUnchanged && normalizedHandleInput === '' && (
                  <span className="text-muted-foreground">Choose a public handle.</span>
                )}
                {!handleUnchanged && normalizedHandleInput !== '' && !handleFormatValid && (
                  <span className="text-destructive">
                    Handles must be 5-15 characters, start with a letter, and use only letters,
                    numbers, or underscores.
                  </span>
                )}
                {handlePendingVerification && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Checking availability...
                  </span>
                )}
                {handleTaken && !handlePendingVerification && (
                  <span className="text-destructive">❌ This handle is already taken.</span>
                )}
                {handleAvailable && !handlePendingVerification && (
                  <span className="text-primary">✅ Handle is available!</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="phone_number">
                  Phone number
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit phone number"
                    value={profileDetailsFormik.values.phone_number}
                    onChange={profileDetailsFormik.handleChange}
                    onBlur={profileDetailsFormik.handleBlur}
                    aria-invalid={Boolean(
                      profileDetailsFormik.touched.phone_number &&
                        profileDetailsFormik.errors.phone_number,
                    )}
                    className="h-11 rounded-xl border-border/60 bg-background pl-9"
                  />
                </div>
                <FieldError formik={profileDetailsFormik} name="phone_number" />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="instagram">
                  Instagram URL / handle
                </label>
                <div className="relative">
                  <FaInstagram className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="instagram"
                    name="instagram"
                    placeholder="https://instagram.com/you or @you"
                    value={profileDetailsFormik.values.instagram}
                    onChange={profileDetailsFormik.handleChange}
                    onBlur={profileDetailsFormik.handleBlur}
                    aria-invalid={Boolean(
                      profileDetailsFormik.touched.instagram &&
                        profileDetailsFormik.errors.instagram,
                    )}
                    className="h-11 rounded-xl border-border/60 bg-background pl-9"
                  />
                </div>
                <FieldError formik={profileDetailsFormik} name="instagram" />
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="facebook">
                  Facebook URL / handle
                </label>
                <div className="relative">
                  <FaFacebook className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="facebook"
                    name="facebook"
                    placeholder="https://facebook.com/you or @you"
                    value={profileDetailsFormik.values.facebook}
                    onChange={profileDetailsFormik.handleChange}
                    onBlur={profileDetailsFormik.handleBlur}
                    aria-invalid={Boolean(
                      profileDetailsFormik.touched.facebook && profileDetailsFormik.errors.facebook,
                    )}
                    className="h-11 rounded-xl border-border/60 bg-background pl-9"
                  />
                </div>
                <FieldError formik={profileDetailsFormik} name="facebook" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Instagram and Facebook accept a full URL or a plain handle.
              </p>
              <Button
                type="submit"
                data-testid="handle-save"
                disabled={
                  profileDetailsMutation.isPending ||
                  !handleFormatValid ||
                  (handlePendingVerification && !handleUnchanged) ||
                  handleTaken
                }
                className="rounded-xl bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/90"
              >
                {profileDetailsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save profile details
                  </>
                )}
              </Button>
            </div>
          </form>
        </section>

        <Separator className="bg-border/60" />

        <section className="bg-card border border-border rounded-3xl p-6 shadow-xs">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Location settings</h2>
              <p className="text-sm text-muted-foreground">
                Locale changes are enforced once every 30 days by the server.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Current location</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {profile?.city || 'Not set'}
                {profile?.state ? `, ${profile.state}` : ''}
              </p>
              {lastLocationChange && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Last changed: {lastLocationChange}
                </p>
              )}
            </div>

            <Button
              type="button"
              onClick={() => setLocationOpen(true)}
              disabled={locationLocked}
              className="rounded-xl bg-primary px-5 font-bold text-primary-foreground shadow-xs hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            >
              {locationLocked ? (
                <>
                  <Clock3 className="mr-2 h-4 w-4" />
                  Locked for {cooldownDays} day{cooldownDays === 1 ? '' : 's'}
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  Change Location
                </>
              )}
            </Button>
          </div>

          {locationLocked && nextLocationChange && (
            <p className="mt-3 text-sm text-muted-foreground">
              Next eligible change:{' '}
              <span className="font-semibold text-muted-foreground">{nextLocationChange}</span>
            </p>
          )}

          {profile?.location_2_active || profile?.location_3_active ? (
            <div className="mt-5 grid gap-4">
              {profile?.location_2_active ? (
                <SecondaryLocationCard profile={profile} slotKey="location_2" label="Location 2" />
              ) : null}
              {profile?.location_3_active ? (
                <SecondaryLocationCard profile={profile} slotKey="location_3" label="Location 3" />
              ) : null}
            </div>
          ) : null}
        </section>

        <Separator className="bg-border/60" />

        <section className="bg-card border border-border rounded-3xl p-6 shadow-xs">
          <Accordion type="single" collapsible>
            <AccordionItem value="moderated-profiles" className="border-0">
              <AccordionTrigger className="py-0 hover:no-underline">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                    <ShieldAlert className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block text-lg font-bold text-foreground">
                      Moderated Profiles &amp; Connections
                    </span>
                    <span className="mt-0.5 block text-sm font-normal text-muted-foreground">
                      Review and restore profiles you have muted or blocked.
                    </span>
                  </span>
                </span>
              </AccordionTrigger>

              <AccordionContent className="pt-5">
                {moderatedQuery.isLoading ? (
                  <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-muted/30 p-8">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="ml-2 text-sm font-medium text-muted-foreground">
                      Loading moderated profiles...
                    </span>
                  </div>
                ) : moderatedQuery.isError ? (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                    <p className="font-bold">Moderated profiles could not load.</p>
                    <p className="mt-1 text-destructive/90">
                      {moderatedQuery.error?.message || 'Check your connection and try again.'}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moderatedQuery.refetch()}
                      className="mt-3 rounded-xl border-destructive/30 bg-background text-destructive hover:bg-destructive/10"
                    >
                      Retry
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {[
                      {
                        key: 'blocked',
                        label: 'Blocked profiles',
                        kind: 'block',
                        action: 'Unblock',
                        icon: Ban,
                        profiles: moderatedQuery.data?.blocked ?? [],
                      },
                      {
                        key: 'muted',
                        label: 'Muted profiles',
                        kind: 'mute',
                        action: 'Unmute',
                        icon: VolumeX,
                        profiles: moderatedQuery.data?.muted ?? [],
                      },
                    ].map(group => {
                      const GroupIcon = group.icon;

                      return (
                        <div key={group.key} className="space-y-2">
                          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                            <GroupIcon className="h-4 w-4 text-primary" />
                            {group.label} ({group.profiles.length})
                          </p>

                          {group.profiles.length === 0 ? (
                            <p className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                              No {group.key} profiles.
                            </p>
                          ) : (
                            group.profiles.map(profile => {
                              const isPending =
                                restoreModerationMutation.isPending &&
                                restoreModerationMutation.variables?.targetId === profile.id &&
                                restoreModerationMutation.variables?.kind === group.kind;

                              return (
                                <div
                                  key={`${group.kind}-${profile.id}`}
                                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    {profile.avatar_url ? (
                                      <img
                                        src={profile.avatar_url}
                                        alt={profileName(profile)}
                                        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-border"
                                      />
                                    ) : (
                                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                        {profileInitials(profile)}
                                      </span>
                                    )}
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-bold text-foreground">
                                        {profileName(profile)}
                                      </p>
                                      <p className="truncate text-xs text-muted-foreground">
                                        {[profile.city, profile.state].filter(Boolean).join(', ') ||
                                          profile.user_handle ||
                                          profile.shortid}
                                      </p>
                                    </div>
                                  </div>

                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isPending}
                                    onClick={() =>
                                      restoreModerationMutation.mutate({
                                        kind: group.kind,
                                        targetId: profile.id,
                                      })
                                    }
                                    className="shrink-0 rounded-xl"
                                  >
                                    {isPending ? (
                                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    ) : null}
                                    {group.action}
                                  </Button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <Separator className="bg-border/60" />

        <section className="bg-card border border-border rounded-3xl p-6 shadow-xs">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <RefreshCw className="h-5 w-5 text-destructive" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Cache management</h2>
              <p className="text-sm text-muted-foreground">
                Clear stale service-worker assets or API responses.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Clear application cache</p>
              <p className="text-sm text-muted-foreground">
                Useful after deployments or when a screen keeps stale data.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={clearCache}
              className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              Clear Cache
            </Button>
          </div>
        </section>

        <Separator className="bg-border/60" />

        <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Billing History &amp; Invoices</h2>
              <p className="text-sm text-muted-foreground">
                Server-verified PhonePe transactions and generated invoices.
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-foreground">Date</TableHead>
                  <TableHead className="text-foreground">Order</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-right text-foreground">Amount</TableHead>
                  <TableHead className="text-right text-foreground">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingLoading ? (
                  <TableRow className="border-border/60">
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : billingTransactions.length === 0 ? (
                  <TableRow className="border-border/60">
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No billing history yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  billingTransactions.map(transaction => (
                    <TableRow key={transaction.id} className="border-border/60 hover:bg-muted/30">
                      <TableCell className="text-muted-foreground">
                        {transaction.inserted_at
                          ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                              new Date(transaction.inserted_at),
                            )
                          : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-foreground">
                        {transaction.order_id}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            transaction.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : transaction.status === 'failed'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {transaction.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        ₹{((transaction.amount_paise || 0) / 100).toFixed(0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {transaction.invoice_url ? (
                          <a
                            href={transaction.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-primary hover:underline"
                          >
                            Download
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">Pending</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <section
          data-testid="invoices-receipts"
          className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Receipt className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Invoices &amp; Receipts</h2>
              <p className="text-sm text-muted-foreground">
                Itemized annual fees and monthly addon invoices.
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-foreground">Invoice</TableHead>
                  <TableHead className="text-foreground">Description</TableHead>
                  <TableHead className="text-foreground">Period</TableHead>
                  <TableHead className="text-right text-foreground">Total</TableHead>
                  <TableHead className="text-right text-foreground">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicesLoading ? (
                  <TableRow className="border-border/60">
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow className="border-border/60">
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No invoices yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map(invoice => (
                    <TableRow key={invoice.id} className="border-border/60 hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-bold text-foreground">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{invoice.description}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {readableDate(invoice.period_start) || '—'} –{' '}
                        {readableDate(invoice.period_end) || '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        {formatInr(invoice.total_amount_inr)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-border/60"
                          onClick={() => setActiveInvoice(invoice)}
                        >
                          View / Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <Dialog open={Boolean(activeInvoice)} onOpenChange={open => !open && setActiveInvoice(null)}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Receipt className="h-5 w-5 text-primary" />
              {activeInvoice?.invoice_number}
            </DialogTitle>
            <DialogDescription>{activeInvoice?.description}</DialogDescription>
          </DialogHeader>

          {activeInvoice ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Base amount</span>
                <span className="font-semibold text-foreground">
                  {formatInr(activeInvoice.base_amount_inr)}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">GST at 18%</span>
                <span className="font-semibold text-foreground">
                  {formatInr(activeInvoice.gst_amount_inr)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-foreground">Total paid</span>
                <span className="font-black text-foreground">
                  {formatInr(activeInvoice.total_amount_inr)}
                </span>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/40 p-3 text-muted-foreground">
                Period: {readableDate(activeInvoice.period_start) || '—'} –{' '}
                {readableDate(activeInvoice.period_end) || '—'}
              </div>

              {activeInvoice.pdf_url ? (
                <Button
                  asChild
                  className="w-full rounded-xl bg-primary font-bold text-primary-foreground"
                >
                  <a href={activeInvoice.pdf_url} target="_blank" rel="noopener noreferrer">
                    Download PDF receipt
                  </a>
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  A downloadable PDF will appear here once the payment provider finishes processing.
                </p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={locationOpen} onOpenChange={setLocationOpen}>
        <DialogContent className="sm:max-w-[540px] rounded-3xl">
          <form onSubmit={handleLocationSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <MapPin className="h-5 w-5 text-primary" />
                Change your location
              </DialogTitle>
              <DialogDescription>
                Select a new state and city. The 30-day cooldown is enforced by the backend.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label
                  className="text-sm font-semibold text-muted-foreground"
                  htmlFor="settings-state"
                >
                  State
                </label>
                <Select
                  value={selectedState}
                  onValueChange={value => {
                    setSelectedState(value);
                    setSelectedCity('');
                  }}
                >
                  <SelectTrigger id="settings-state" className="w-full rounded-xl">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {states.map(state => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <label
                  className="text-sm font-semibold text-muted-foreground"
                  htmlFor="settings-city"
                >
                  City
                </label>
                <Select
                  value={selectedCity}
                  onValueChange={setSelectedCity}
                  disabled={!selectedState}
                >
                  <SelectTrigger id="settings-city" className="w-full rounded-xl">
                    <SelectValue
                      placeholder={selectedState ? 'Select city' : 'Select state first'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {cityOptions.map(city => (
                        <SelectItem key={city.name} value={city.name} disabled={city.disabled}>
                          {city.name}
                          {city.reason ? ` ${city.reason}` : ''}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedCity && !coordinates && (
              <p className="mt-3 text-sm font-medium text-destructive">
                Coordinates are not available for this city yet. Choose another city.
              </p>
            )}

            {primarySelectedConflict && (
              <p className="mt-3 text-sm font-medium text-destructive">
                This city is already assigned to {primarySelectedConflict.label}.
              </p>
            )}

            <DialogFooter className="mt-6 gap-3">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-xl px-4">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={
                  updateLocationMutation.isPending ||
                  locationLocked ||
                  !selectedState ||
                  !selectedCity ||
                  !coordinates ||
                  Boolean(primarySelectedConflict)
                }
                className="rounded-xl bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90"
              >
                {updateLocationMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Update Location
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Settings;
