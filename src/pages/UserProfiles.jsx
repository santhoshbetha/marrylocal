import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  MapPin,
  Calendar,
  Phone,
  Mail,
  User,
  Shield,
  CreditCard,
  Search,
  RefreshCw,
} from 'lucide-react';
import { describeApiError } from '@/api/client';
import { adminKeys, fetchAdminUsers } from '@/api/admin';

function StatusBadge({ active, onLabel = 'Verified', offLabel = 'Not verified' }) {
  return (
    <Badge
      variant="outline"
      className={
        active
          ? 'border-primary/30 bg-primary/15 text-primary'
          : 'border-destructive/30 bg-destructive/10 text-destructive'
      }
    >
      {active ? onLabel : offLabel}
    </Badge>
  );
}

function formatDate(value) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === '') return 'Not set';
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) return 'Not set';
  return `₹${parsed.toLocaleString('en-IN')}`;
}

export default function UserProfiles() {
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const usersQuery = useQuery({
    queryKey: adminKeys.users(filters ?? {}),
    queryFn: ({ signal }) => fetchAdminUsers(filters, { signal }),
    enabled: Boolean(filters),
  });

  const users = usersQuery.data ?? [];
  const selectedUser = users.find(user => user.id === selectedId) ?? null;

  const handleSearch = async () => {
    const query = searchText.trim();

    if (!query) {
      toast.error('Please enter search text');
      return;
    }

    setSelectedId(null);

    if (filters?.query === query) {
      const result = await usersQuery.refetch();
      if (result.error) {
        toast.error(describeApiError(result.error, 'Could not refresh users'));
      }
    } else {
      setFilters({ query });
    }
  };

  const handleClear = () => {
    setSearchText('');
    setFilters(null);
    setSelectedId(null);
    toast.success('Search cleared');
  };

  const handleRefresh = async () => {
    const result = await usersQuery.refetch();
    if (result.error) {
      toast.error(describeApiError(result.error, 'Could not refresh users'));
    }
  };

  const isFetching = usersQuery.isFetching;

  return (
    <div className="container mx-auto max-w-7xl p-4">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <User className="h-6 w-6 text-primary" />
            User Profile Viewer
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Read-only inspection of verification, payment, location, and account flags.
          </p>
        </div>
        {filters ? (
          <Badge variant="outline" className="border-border/60 bg-muted/40 text-muted-foreground">
            {users.length} result{users.length === 1 ? '' : 's'}
          </Badge>
        ) : null}
      </div>

      <Card className="mb-6 border-border/60 bg-card">
        <CardHeader>
          <CardTitle>Search users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Name, email, phone, handle, or shortid — separate terms with semicolons"
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
            <Button onClick={handleSearch} disabled={isFetching}>
              <Search className="mr-2 h-4 w-4" />
              {isFetching ? 'Searching…' : 'Search'}
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={!filters || isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {usersQuery.isError ? (
        <Card className="mb-6 border-destructive/30 bg-destructive/5">
          <CardContent className="py-6 text-sm text-destructive">
            {describeApiError(usersQuery.error, 'Could not load users')}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-border/60 bg-card lg:col-span-1">
          <CardHeader>
            <CardTitle>Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {users.length > 0 ? (
              <div className="max-h-[36rem] space-y-2 overflow-y-auto pr-1">
                {users.map(user => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedId(user.id)}
                    className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                      selectedId === user.id
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-border/60 bg-muted/40 hover:bg-muted/60'
                    }`}
                  >
                    <div className="truncate text-sm font-medium text-foreground">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {user.email || 'No email'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: {user.shortid || user.id} · {user.user_state}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                {isFetching
                  ? 'Loading users…'
                  : filters
                    ? 'No users matched that search.'
                    : 'Search for users to inspect their profiles.'}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedUser
                ? `${selectedUser.first_name} ${selectedUser.last_name}'s profile`
                : 'Select a user'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedUser ? (
              <div className="space-y-6">
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
                    <User className="h-5 w-5 text-primary" />
                    Basic information
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">User ID</Label>
                        <Badge variant="outline">{selectedUser.id}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">Short ID</Label>
                        <Badge variant="secondary">{selectedUser.shortid || '—'}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">Role</Label>
                        <Badge
                          variant="outline"
                          className={
                            selectedUser.role === 'admin'
                              ? 'border-destructive/30 bg-destructive/10 text-destructive'
                              : 'border-primary/30 bg-primary/15 text-primary'
                          }
                        >
                          {selectedUser.role || 'user'}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">First name</Label>
                        <span className="text-foreground">
                          {selectedUser.first_name || 'Not set'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">Last name</Label>
                        <span className="text-foreground">
                          {selectedUser.last_name || 'Not set'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">Gender</Label>
                        <span className="text-foreground">{selectedUser.gender || 'Not set'}</span>
                      </div>
                    </div>
                  </div>
                </section>

                <Separator className="bg-border/60" />

                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Mail className="h-5 w-5 text-primary" />
                    Contact information
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <div>
                        <Label className="text-sm font-medium">Email</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">{selectedUser.email || 'Not set'}</span>
                          <StatusBadge active={selectedUser.email_verified} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      <div>
                        <Label className="text-sm font-medium">Phone</Label>
                        <span className="text-foreground">
                          {selectedUser.phone_number || 'Not set'}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                <Separator className="bg-border/60" />

                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Calendar className="h-5 w-5 text-primary" />
                    Personal information
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Age</Label>
                      <span className="text-foreground">
                        {selectedUser.age ? `${selectedUser.age} years` : 'Not set'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Education</Label>
                      <span className="text-foreground">
                        {selectedUser.education_level || 'Not set'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Economic status</Label>
                      <span className="text-foreground">
                        {selectedUser.economic_status || 'Not set'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Job status</Label>
                      <span className="text-foreground">
                        {selectedUser.job_status ? 'Employed' : 'Not employed'}
                      </span>
                    </div>
                  </div>
                </section>

                <Separator className="bg-border/60" />

                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
                    <MapPin className="h-5 w-5 text-primary" />
                    Location information
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">City</Label>
                      <span className="text-foreground">{selectedUser.city || 'Not set'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">State</Label>
                      <span className="text-foreground">{selectedUser.state || 'Not set'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Latitude</Label>
                      <span className="text-foreground">{selectedUser.latitude ?? 'Not set'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Longitude</Label>
                      <span className="text-foreground">{selectedUser.longitude ?? 'Not set'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Max search distance</Label>
                      <span className="text-foreground">
                        {selectedUser.max_search_distance
                          ? `${selectedUser.max_search_distance} km`
                          : 'Not set'}
                      </span>
                    </div>
                  </div>
                </section>

                <Separator className="bg-border/60" />

                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Shield className="h-5 w-5 text-primary" />
                    Verification status
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Email</Label>
                      <StatusBadge active={selectedUser.email_verified} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Aadhaar</Label>
                      <StatusBadge active={selectedUser.aadhaar_verified} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Passport</Label>
                      <StatusBadge active={selectedUser.passport_verified} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">License</Label>
                      <StatusBadge active={selectedUser.license_verified} />
                    </div>
                  </div>
                </section>

                <Separator className="bg-border/60" />

                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Payment & terms
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Terms accepted</Label>
                      <StatusBadge
                        active={selectedUser.terms_accepted}
                        onLabel="Accepted"
                        offLabel="Not accepted"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">One-time fees paid</Label>
                      <StatusBadge
                        active={selectedUser.one_time_fees_paid}
                        onLabel="Paid"
                        offLabel="Not paid"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">One-time fees required</Label>
                      <Badge
                        variant="outline"
                        className={
                          selectedUser.one_time_fees_required
                            ? 'border-primary/30 bg-primary/15 text-primary'
                            : 'border-border/60 bg-muted/40 text-muted-foreground'
                        }
                      >
                        {selectedUser.one_time_fees_required ? 'Required' : 'Not required'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Fees amount</Label>
                      <span className="font-medium text-foreground">
                        {formatCurrency(selectedUser.accepted_one_time_fees_amount)}
                      </span>
                    </div>
                  </div>
                </section>

                <Separator className="bg-border/60" />

                <section>
                  <h3 className="mb-3 text-lg font-semibold text-foreground">Account status</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">User state</Label>
                      <Badge
                        variant="outline"
                        className={
                          selectedUser.user_state === 'active'
                            ? 'border-primary/30 bg-primary/15 text-primary'
                            : 'border-border/60 bg-muted/40 text-muted-foreground'
                        }
                      >
                        {selectedUser.user_state || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Beta tester</Label>
                      <StatusBadge
                        active={selectedUser.is_beta_tester}
                        onLabel="Enabled"
                        offLabel="Disabled"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Created</Label>
                      <span className="text-foreground">
                        {formatDate(selectedUser.inserted_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Last updated</Label>
                      <span className="text-foreground">{formatDate(selectedUser.updated_at)}</span>
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <User className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>Select a user from the list to view their complete profile.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
