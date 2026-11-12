import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  FileImage,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react';
import { describeApiError } from '@/api/client';
import {
  adminKeys,
  approveAdminVerification,
  fetchAdminSettings,
  fetchAdminVerifications,
  lookupAdminUser,
  rejectAdminVerification,
  updateAdminSettings,
  updateAdminUser,
} from '@/api/admin';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const USER_STATES = ['active', 'inactive', 'deleted'];

const BOOLEAN_FIELDS = [
  { key: 'email_verified', label: 'Email verified' },
  { key: 'aadhaar_verified', label: 'Aadhaar verified' },
  { key: 'passport_verified', label: 'Passport verified' },
  { key: 'license_verified', label: 'License verified' },
  { key: 'terms_accepted', label: 'Terms accepted' },
  { key: 'one_time_fees_paid', label: 'One-time fees paid' },
  { key: 'one_time_fees_required', label: 'One-time fees required' },
];

const EMPTY_FORM = {
  city: '',
  state: '',
  latitude: '',
  longitude: '',
  age: '',
  max_search_distance: '',
  accepted_one_time_fees_amount: '',
  email_verified: false,
  aadhaar_verified: false,
  passport_verified: false,
  license_verified: false,
  terms_accepted: false,
  one_time_fees_paid: false,
  one_time_fees_required: false,
  is_beta_tester: false,
  user_state: 'active',
};

function formFromUser(user) {
  return {
    city: user.city ?? '',
    state: user.state ?? '',
    latitude: user.latitude ?? '',
    longitude: user.longitude ?? '',
    age: user.age ?? '',
    max_search_distance: user.max_search_distance ?? '',
    accepted_one_time_fees_amount: user.accepted_one_time_fees_amount ?? '',
    email_verified: Boolean(user.email_verified),
    aadhaar_verified: Boolean(user.aadhaar_verified),
    passport_verified: Boolean(user.passport_verified),
    license_verified: Boolean(user.license_verified),
    terms_accepted: Boolean(user.terms_accepted),
    one_time_fees_paid: Boolean(user.one_time_fees_paid),
    one_time_fees_required: Boolean(user.one_time_fees_required),
    is_beta_tester: Boolean(user.is_beta_tester),
    user_state: user.user_state || 'active',
  };
}

function optionalNumber(value) {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalInteger(value) {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildUpdates(form) {
  return {
    city: form.city,
    state: form.state,
    latitude: optionalNumber(form.latitude),
    longitude: optionalNumber(form.longitude),
    age: optionalInteger(form.age),
    max_search_distance: optionalInteger(form.max_search_distance),
    accepted_one_time_fees_amount: optionalInteger(form.accepted_one_time_fees_amount),
    is_beta_tester: form.is_beta_tester,
    user_state: form.user_state,
    ...Object.fromEntries(BOOLEAN_FIELDS.map(field => [field.key, Boolean(form[field.key])])),
  };
}

export default function Admin() {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const lookupTerm = useRef('');

  const [searchText, setSearchText] = useState('');
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const lookupQuery = useQuery({
    queryKey: adminKeys.userLookup(),
    queryFn: ({ signal }) => lookupAdminUser(lookupTerm.current, { signal }),
    enabled: false,
    retry: false,
    gcTime: 0,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => updateAdminUser(id, updates),
    onSuccess: updated => {
      if (updated) {
        setUser(updated);
        setFormData(formFromUser(updated));
      }
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
      toast.success('User updated successfully');
    },
    onError: error => {
      toast.error(describeApiError(error, 'Could not update the user'));
    },
  });

  const settingsQuery = useQuery({
    queryKey: adminKeys.settings(),
    queryFn: ({ signal }) => fetchAdminSettings({ signal }),
    staleTime: 30_000,
  });

  const settingsMutation = useMutation({
    mutationFn: settings => updateAdminSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
      toast.success('Verification enforcement updated');
    },
    onError: error => {
      toast.error(describeApiError(error, 'Could not update verification enforcement'));
    },
  });

  const verificationsQuery = useQuery({
    queryKey: adminKeys.verifications(),
    queryFn: ({ signal }) => fetchAdminVerifications({ signal }),
    staleTime: 15_000,
  });

  const approveVerificationMutation = useMutation({
    mutationFn: id => approveAdminVerification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.verifications() });
      toast.success('Identity approved and raw document purged');
    },
    onError: error => {
      toast.error(describeApiError(error, 'Could not approve this document'));
    },
  });

  const rejectVerificationMutation = useMutation({
    mutationFn: ({ id, reason }) => rejectAdminVerification(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.verifications() });
      toast.success('Identity rejected and raw document purged');
    },
    onError: error => {
      toast.error(describeApiError(error, 'Could not reject this document'));
    },
  });

  const applyUser = nextUser => {
    setUser(nextUser);
    setFormData(nextUser ? formFromUser(nextUser) : EMPTY_FORM);
  };

  const handleSearch = async () => {
    const term = searchText.trim();

    if (!term) {
      toast.error('Please enter an email, phone number, handle, shortid, or id');
      return;
    }

    if (!isOnline) {
      toast.error('You are offline');
      return;
    }

    lookupTerm.current = term;
    const result = await lookupQuery.refetch();

    if (result.data) {
      applyUser(result.data);
      toast.success('User found');
    } else {
      applyUser(null);
      toast.error(describeApiError(result.error, 'User not found'));
    }
  };

  const handleRefresh = async () => {
    if (!lookupTerm.current) return;

    const result = await lookupQuery.refetch();

    if (result.data) {
      applyUser(result.data);
      toast.success('User refreshed from the server');
    } else {
      toast.error(describeApiError(result.error, 'Could not refresh the user'));
    }
  };

  const handleSave = () => {
    if (!user) return;

    if (!isOnline) {
      toast.error('You are offline');
      return;
    }

    updateMutation.mutate({ id: user.id, updates: buildUpdates(formData) });
  };

  const handleClear = () => {
    lookupTerm.current = '';
    setSearchText('');
    applyUser(null);
  };

  const handleInputChange = (field, value) => {
    setFormData(previous => ({ ...previous, [field]: value }));
  };

  const isSaving = updateMutation.isPending;
  const isSearching = lookupQuery.isFetching;

  return (
    <div className="container mx-auto max-w-6xl p-4">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <UserRound className="h-6 w-6 text-primary" />
            User Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Look up a user by email, phone, handle, shortid, or id and update their admin flags.
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            isOnline
              ? 'border-primary/30 bg-primary/15 text-primary'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }
        >
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      </div>

      <Card className="mb-6 border-border/60 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Platform Verification Enforcement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-foreground">Master verification gate</p>
              <p className="mt-1 text-sm text-muted-foreground">
                When enabled, unverified users older than 7 days with more than 50 opposite-gender
                members within 50 km must verify their identity before searching. Off by default for
                launch.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={
                  settingsQuery.data?.enforce_verification_gate
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground'
                }
              >
                {settingsQuery.data?.enforce_verification_gate ? 'Enabled' : 'Disabled'}
              </Badge>
              <Switch
                data-testid="admin-verification-gate"
                checked={Boolean(settingsQuery.data?.enforce_verification_gate)}
                disabled={settingsQuery.isLoading || settingsMutation.isPending}
                onCheckedChange={checked =>
                  settingsMutation.mutate({ enforce_verification_gate: checked === true })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 border-border/60 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Platform Payment Enforcement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-foreground">Annual service fee gate</p>
              <p className="mt-1 text-sm text-muted-foreground">
                When enabled, non-admin users in cities with more than 250 active opposite-gender
                members must pay the annual service fee before searching.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={
                  settingsQuery.data?.enforce_payment_gate
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground'
                }
              >
                {settingsQuery.data?.enforce_payment_gate ? 'Enabled' : 'Disabled'}
              </Badge>
              <Switch
                data-testid="admin-payment-gate"
                checked={Boolean(settingsQuery.data?.enforce_payment_gate)}
                disabled={settingsQuery.isLoading || settingsMutation.isPending}
                onCheckedChange={checked =>
                  settingsMutation.mutate({ enforce_payment_gate: checked === true })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 border-border/60 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5 text-primary" />
            Identity Review Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {verificationsQuery.isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading submissions...</p>
          ) : verificationsQuery.data?.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {verificationsQuery.data.map(verification => (
                <div
                  key={verification.id}
                  className="rounded-2xl border border-border/60 bg-muted/30 p-4"
                >
                  <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
                      {verification.document_image_url ? (
                        <img
                          src={verification.document_image_url}
                          alt="Private identity document preview"
                          className="h-40 w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
                          Preview unavailable
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-foreground">
                          {verification.user?.first_name} {verification.user?.last_name}
                        </p>
                        <Badge variant="secondary">
                          {verification.user?.age || '—'} yrs · {verification.user?.gender || '—'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {verification.document_type} · {verification.document_number}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted{' '}
                        {verification.inserted_at
                          ? new Date(verification.inserted_at).toLocaleString('en-IN')
                          : 'recently'}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          data-testid={`admin-approve-verification-${verification.id}`}
                          disabled={
                            approveVerificationMutation.isPending ||
                            rejectVerificationMutation.isPending
                          }
                          onClick={() => approveVerificationMutation.mutate(verification.id)}
                          className="rounded-xl bg-emerald-600 px-4 font-bold text-white hover:bg-emerald-500"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={
                            approveVerificationMutation.isPending ||
                            rejectVerificationMutation.isPending
                          }
                          onClick={() => {
                            const reason = window.prompt('Rejection reason');
                            if (reason?.trim()) {
                              rejectVerificationMutation.mutate({
                                id: verification.id,
                                reason: reason.trim(),
                              });
                            }
                          }}
                          className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No documents waiting for review.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6 border-border/60 bg-card">
        <CardHeader>
          <CardTitle>Search user</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Email, phone, @handle, shortid, or numeric id"
              value={searchText}
              onChange={event => setSearchText(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSearch();
                }
              }}
              className="border-border/60 bg-background"
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              <Search className="mr-2 h-4 w-4" />
              {isSearching ? 'Searching…' : 'Search'}
            </Button>
            <Button variant="outline" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {user ? (
        <Card className="border-border/60 bg-card">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {user.first_name} {user.last_name}
                  <Badge variant="secondary">{user.shortid || user.id}</Badge>
                  {user.is_beta_tester ? (
                    <Badge
                      variant="outline"
                      className="border-primary/30 bg-primary/15 text-primary"
                    >
                      <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                      Beta tester
                    </Badge>
                  ) : null}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {user.email || 'No email'} · {user.phone_number || 'No phone'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-border/60 bg-muted/40 text-muted-foreground"
                >
                  {user.user_state}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={lookupQuery.isFetching}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${lookupQuery.isFetching ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="first_name">First name</Label>
                <Input id="first_name" value={user.first_name ?? ''} disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input id="last_name" value={user.last_name ?? ''} disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user.email ?? ''} disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone_number">Phone number</Label>
                <Input id="phone_number" value={user.phone_number ?? ''} disabled />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={event => handleInputChange('city', event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={event => handleInputChange('state', event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="user_state">Account state</Label>
                <Select
                  value={formData.user_state}
                  onValueChange={value => handleInputChange('user_state', value)}
                >
                  <SelectTrigger id="user_state" className="border-border/60 bg-background">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_STATES.map(state => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min="18"
                  max="120"
                  value={formData.age}
                  onChange={event => handleInputChange('age', event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={event => handleInputChange('latitude', event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={event => handleInputChange('longitude', event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max_search_distance">Max search distance (km)</Label>
                <Input
                  id="max_search_distance"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.max_search_distance}
                  onChange={event => handleInputChange('max_search_distance', event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="accepted_one_time_fees_amount">Accepted one-time fee (₹)</Label>
                <Input
                  id="accepted_one_time_fees_amount"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.accepted_one_time_fees_amount}
                  onChange={event =>
                    handleInputChange('accepted_one_time_fees_amount', event.target.value)
                  }
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Verification & billing</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {BOOLEAN_FIELDS.map(field => (
                  <label
                    key={field.key}
                    htmlFor={field.key}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-sm text-foreground"
                  >
                    <Checkbox
                      id={field.key}
                      checked={Boolean(formData[field.key])}
                      onCheckedChange={checked => handleInputChange(field.key, checked === true)}
                    />
                    {field.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-foreground">Addons / Community Search access</p>
                <p className="text-sm text-muted-foreground">
                  Beta testers receive Addons and Community Search without the one-time fee.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {formData.is_beta_tester ? 'Enabled' : 'Disabled'}
                </span>
                <Switch
                  id="is_beta_tester"
                  checked={Boolean(formData.is_beta_tester)}
                  onCheckedChange={checked => handleInputChange('is_beta_tester', checked === true)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleSave} disabled={isSaving || !isOnline}>
                {isSaving ? 'Saving…' : 'Save changes'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Email and phone are display-only. Update those from the user's own profile flow.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60 bg-card">
          <CardContent className="py-10 text-center text-muted-foreground">
            Search for a user to inspect and update their administrative flags.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
