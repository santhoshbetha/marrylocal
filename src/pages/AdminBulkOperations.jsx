import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { RefreshCw, Users } from 'lucide-react';
import { describeApiError } from '@/api/client';
import { adminKeys, bulkUpdateAdminUsers, fetchAdminUsers } from '@/api/admin';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { states } from '@/lib/states';
import { cities } from '@/lib/cities';

const ITEMS_PER_PAGE = 20;

const BULK_FIELDS = [
  { key: 'email_verified', label: 'Email verified' },
  { key: 'aadhaar_verified', label: 'Aadhaar verified' },
  { key: 'passport_verified', label: 'Passport verified' },
  { key: 'license_verified', label: 'License verified' },
  { key: 'one_time_fees_paid', label: 'One-time fees paid' },
  { key: 'one_time_fees_required', label: 'One-time fees required' },
  { key: 'accepted_one_time_fees_amount', label: 'One-time fees amount', type: 'number' },
];

const EMPTY_BULK_OPTIONS = Object.fromEntries(
  BULK_FIELDS.map(field => [field.key, field.type === 'number' ? '' : false]),
);

const EMPTY_APPLY_OPTIONS = Object.fromEntries(BULK_FIELDS.map(field => [field.key, false]));

function StatusPill({ active, label }) {
  return (
    <span
      className={`rounded-full border px-2 py-1 text-xs font-medium ${
        active
          ? 'border-primary/30 bg-primary/15 text-primary'
          : 'border-destructive/30 bg-destructive/10 text-destructive'
      }`}
    >
      {label} {active ? '✓' : '✗'}
    </span>
  );
}

function pageNumbers(totalPages, currentPage) {
  const start = Math.max(1, Math.min(totalPages - 4, currentPage - 2));
  return Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index).filter(
    page => page <= totalPages,
  );
}

export default function AdminBulkOperations() {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  const [activeTab, setActiveTab] = useState('text-search');
  const [searchText, setSearchText] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [availableCities, setAvailableCities] = useState([]);
  const [filters, setFilters] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkOptions, setBulkOptions] = useState(EMPTY_BULK_OPTIONS);
  const [applyOptions, setApplyOptions] = useState(EMPTY_APPLY_OPTIONS);

  useEffect(() => {
    if (!selectedState) {
      setAvailableCities([]);
      setSelectedCity('');
      return;
    }

    if (selectedState === 'All') {
      setAvailableCities(['All Cities']);
      setSelectedCity('All Cities');
      return;
    }

    const names = cities
      .filter(city => city.state === selectedState)
      .map(city => city.name)
      .sort();

    setAvailableCities(['All', ...names]);
    setSelectedCity(previous =>
      previous && previous !== 'All' && !names.includes(previous) ? '' : previous,
    );
  }, [selectedState]);

  const usersQuery = useQuery({
    queryKey: adminKeys.users(filters ?? {}),
    queryFn: ({ signal }) => fetchAdminUsers(filters, { signal }),
    enabled: Boolean(filters),
  });

  const users = usersQuery.data ?? [];
  const totalPages = Math.max(1, Math.ceil(users.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentUsers = users.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(page => Math.min(page, totalPages));
  }, [totalPages]);

  const bulkMutation = useMutation({
    mutationFn: ({ userIds, updates }) => bulkUpdateAdminUsers(userIds, updates),
    onSuccess: result => {
      setSelectedUsers([]);
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
      toast.success(
        `Updated ${result?.updated_count ?? 0} user${result?.updated_count === 1 ? '' : 's'}`,
      );
    },
    onError: error => {
      toast.error(describeApiError(error, 'Could not update the selected users'));
    },
  });

  const applySearch = async nextFilters => {
    setSelectedUsers([]);
    setCurrentPage(1);

    const isSame = JSON.stringify(filters ?? {}) === JSON.stringify(nextFilters ?? {});

    if (isSame) {
      const result = await usersQuery.refetch();
      if (result.error) {
        toast.error(describeApiError(result.error, 'Could not refresh users'));
      }
    } else {
      setFilters(nextFilters);
    }
  };

  const handleTextSearch = () => {
    const query = searchText.trim();

    if (!query) {
      toast.error('Please enter search text');
      return;
    }

    applySearch({ query });
  };

  const handleLocationSearch = () => {
    if (!selectedState || !selectedCity) {
      toast.error('Please select both state and city');
      return;
    }

    applySearch({ state: selectedState, city: selectedCity });
  };

  const handleUserSelect = (userId, isSelected) => {
    setSelectedUsers(previous =>
      isSelected ? [...new Set([...previous, userId])] : previous.filter(id => id !== userId),
    );
  };

  const handleSelectAll = isSelected => {
    const idsOnPage = currentUsers.map(user => user.id);

    setSelectedUsers(previous =>
      isSelected
        ? [...new Set([...previous, ...idsOnPage])]
        : previous.filter(id => !idsOnPage.includes(id)),
    );
  };

  const handleBulkUpdate = () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    if (!isOnline) {
      toast.error('You are offline');
      return;
    }

    const updates = {};
    let appliedFields = 0;

    for (const field of BULK_FIELDS) {
      if (!applyOptions[field.key]) continue;

      appliedFields += 1;
      const rawValue = bulkOptions[field.key];

      if (field.type === 'number') {
        if (rawValue === '' || rawValue === null || rawValue === undefined) {
          toast.error(`Enter a value for ${field.label}`);
          return;
        }

        const parsed = Number.parseInt(rawValue, 10);
        if (!Number.isFinite(parsed)) {
          toast.error(`${field.label} must be a whole number`);
          return;
        }

        updates[field.key] = parsed;
      } else {
        updates[field.key] = Boolean(rawValue);
      }
    }

    if (appliedFields === 0) {
      toast.error('Select at least one field to apply');
      return;
    }

    bulkMutation.mutate({ userIds: selectedUsers, updates });
  };

  const handleClear = () => {
    setActiveTab('text-search');
    setSearchText('');
    setSelectedState('');
    setSelectedCity('');
    setAvailableCities([]);
    setFilters(null);
    setSelectedUsers([]);
    setCurrentPage(1);
    setBulkOptions(EMPTY_BULK_OPTIONS);
    setApplyOptions(EMPTY_APPLY_OPTIONS);
    toast.success('All data cleared');
  };

  const handleBulkOptionChange = (field, value) => {
    setBulkOptions(previous => ({ ...previous, [field]: value }));
  };

  const handleApplyOptionChange = (field, checked) => {
    setApplyOptions(previous => ({ ...previous, [field]: checked === true }));
  };

  const isFetching = usersQuery.isFetching;
  const isUpdating = bulkMutation.isPending;
  const allOnPageSelected =
    currentUsers.length > 0 && currentUsers.every(user => selectedUsers.includes(user.id));

  return (
    <div className="container mx-auto max-w-6xl p-4">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Users className="h-6 w-6 text-primary" />
            Bulk User Operations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search users, select them, and apply one atomic update to every selected record.
          </p>
        </div>
        {users.length > 0 ? (
          <Badge variant="outline" className="border-border/60 bg-muted/40 text-muted-foreground">
            {users.length} results · {selectedUsers.length} selected
          </Badge>
        ) : null}
      </div>

      <Card className="mb-6 border-border/60 bg-card">
        <CardHeader>
          <CardTitle>Search users</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text-search">Text Search</TabsTrigger>
              <TabsTrigger value="location-search">Location Search</TabsTrigger>
            </TabsList>

            <TabsContent value="text-search" className="space-y-4 pt-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Name, email, phone, handle, or shortid — separate terms with semicolons"
                  value={searchText}
                  onChange={event => setSearchText(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleTextSearch();
                    }
                  }}
                  className="border-border/60 bg-background"
                />
                <Button onClick={handleTextSearch} disabled={isFetching}>
                  {isFetching ? 'Searching…' : 'Search'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="location-search" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="state-select">State</Label>
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger id="state-select" className="border-border/60 bg-background">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All States</SelectItem>
                      {states.map(state => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="city-select">City</Label>
                  <Select
                    value={selectedCity}
                    onValueChange={setSelectedCity}
                    disabled={!selectedState}
                  >
                    <SelectTrigger id="city-select" className="border-border/60 bg-background">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCities.map(city => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleLocationSearch}
                disabled={isFetching || !selectedState || !selectedCity}
              >
                {isFetching ? 'Searching…' : 'Search by location'}
              </Button>
            </TabsContent>
          </Tabs>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                const result = await usersQuery.refetch();
                if (result.error) {
                  toast.error(describeApiError(result.error, 'Could not refresh users'));
                }
              }}
              disabled={!filters || isFetching}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleClear}>
              Clear all
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

      {users.length > 0 ? (
        <>
          <Card className="mb-6 border-border/60 bg-card">
            <CardHeader>
              <CardTitle>Bulk update options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {BULK_FIELDS.map(field => (
                  <div
                    key={field.key}
                    className="rounded-2xl border border-border/60 bg-muted/40 p-3"
                  >
                    <label
                      htmlFor={`apply-${field.key}`}
                      className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground"
                    >
                      <Checkbox
                        id={`apply-${field.key}`}
                        checked={Boolean(applyOptions[field.key])}
                        onCheckedChange={checked => handleApplyOptionChange(field.key, checked)}
                      />
                      Apply {field.label}
                    </label>

                    {field.type === 'number' ? (
                      <Input
                        id={field.key}
                        type="number"
                        min="0"
                        placeholder="Enter amount"
                        value={bulkOptions[field.key]}
                        onChange={event => handleBulkOptionChange(field.key, event.target.value)}
                        disabled={!applyOptions[field.key]}
                        className="mt-3 border-border/60 bg-card"
                      />
                    ) : (
                      <label
                        htmlFor={field.key}
                        className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"
                      >
                        <Checkbox
                          id={field.key}
                          checked={Boolean(bulkOptions[field.key])}
                          onCheckedChange={checked =>
                            handleBulkOptionChange(field.key, checked === true)
                          }
                          disabled={!applyOptions[field.key]}
                        />
                        Set to true
                      </label>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleBulkUpdate}
                  disabled={isUpdating || selectedUsers.length === 0 || !isOnline}
                >
                  {isUpdating
                    ? 'Updating…'
                    : `Update ${selectedUsers.length} selected user${
                        selectedUsers.length === 1 ? '' : 's'
                      }`}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Applied as one atomic database update. Unknown fields are ignored by the server.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>
                  Users ({users.length}) · page {currentPage} of {totalPages}
                </CardTitle>
                <label
                  htmlFor="select-all"
                  className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"
                >
                  <Checkbox
                    id="select-all"
                    checked={allOnPageSelected}
                    onCheckedChange={handleSelectAll}
                  />
                  Select all on page
                </label>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
                {currentUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/40 p-3 sm:flex-row sm:items-center"
                  >
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={checked => handleUserSelect(user.id, checked === true)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-foreground">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="truncate text-sm text-muted-foreground">
                        {user.email || 'No email'} • {user.phone_number || 'No phone'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ID: {user.shortid || user.id} · {user.user_state}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <StatusPill active={user.email_verified} label="Email" />
                      <StatusPill active={user.aadhaar_verified} label="Aadhaar" />
                      <StatusPill active={user.passport_verified} label="Passport" />
                      <StatusPill active={user.license_verified} label="License" />
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}–{Math.min(endIndex, users.length)} of {users.length}{' '}
                    users
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentPage(page => Math.max(1, page - 1));
                        setSelectedUsers([]);
                      }}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>

                    {pageNumbers(totalPages, currentPage).map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setCurrentPage(page);
                          setSelectedUsers([]);
                        }}
                      >
                        {page}
                      </Button>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentPage(page => Math.min(totalPages, page + 1));
                        setSelectedUsers([]);
                      }}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}

      {!filters && !usersQuery.isError ? (
        <Card className="border-border/60 bg-card">
          <CardContent className="py-10 text-center text-muted-foreground">
            Run a text or location search to load users for bulk updates.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
