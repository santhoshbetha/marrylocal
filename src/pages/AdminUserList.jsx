import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  MapPin,
  Users,
  Mail,
  Phone,
  User,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
} from 'lucide-react';
import { describeApiError } from '@/api/client';
import { adminKeys, fetchAdminUsers } from '@/api/admin';
import { states } from '@/lib/states';
import { cities } from '@/lib/cities';

const USERS_PER_PAGE = 10;

function pageNumbers(totalPages, currentPage) {
  const start = Math.max(1, Math.min(totalPages - 4, currentPage - 2));
  return Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index).filter(
    page => page <= totalPages,
  );
}

export default function AdminUserList() {
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [availableCities, setAvailableCities] = useState([]);
  const [committedFilters, setCommittedFilters] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

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
    queryKey: adminKeys.users(committedFilters ?? {}),
    queryFn: ({ signal }) => fetchAdminUsers(committedFilters, { signal }),
    enabled: Boolean(committedFilters),
  });

  const users = usersQuery.data ?? [];
  const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(page => Math.min(page, totalPages));
  }, [totalPages]);

  const startIndex = (currentPage - 1) * USERS_PER_PAGE;
  const endIndex = startIndex + USERS_PER_PAGE;
  const currentUsers = users.slice(startIndex, endIndex);

  const handleSearch = async () => {
    if (!selectedState || !selectedCity) {
      toast.error('Please select both state and city');
      return;
    }

    setCurrentPage(1);

    const next = { state: selectedState, city: selectedCity };
    const isSame = committedFilters?.state === next.state && committedFilters?.city === next.city;

    if (isSame) {
      const result = await usersQuery.refetch();
      if (result.error) {
        toast.error(describeApiError(result.error, 'Could not refresh users'));
      }
    } else {
      setCommittedFilters(next);
    }
  };

  const handleClear = () => {
    setSelectedState('');
    setSelectedCity('');
    setCurrentPage(1);
    setCommittedFilters(null);
    toast.success('Selection cleared');
  };

  const exportToCSV = () => {
    if (users.length === 0) {
      toast.error('No users to export');
      return;
    }

    const csvContent = [
      ['Name', 'Email', 'Phone Number', 'State', 'City'],
      ...users.map(user => [
        `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
        user.email || '',
        user.phone_number || '',
        user.state || (selectedState === 'All' ? 'All States' : selectedState),
        user.city || (selectedCity === 'All Cities' ? 'All Cities' : selectedCity),
      ]),
    ]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const locationText =
      selectedState === 'All'
        ? 'all_states'
        : selectedCity === 'All'
          ? 'all_cities'
          : selectedCity.replace(/[^a-zA-Z0-9]/g, '_');
    const stateText =
      selectedState === 'All' ? 'all_states' : selectedState.replace(/[^a-zA-Z0-9]/g, '_');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `users_${locationText}_${stateText}_${new Date().toISOString().split('T')[0]}.csv`,
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const locationLabel =
    selectedState === 'All'
      ? 'All states'
      : selectedCity === 'All'
        ? `All cities in ${selectedState}`
        : `${selectedCity}, ${selectedState}`;

  const isSearching = usersQuery.isFetching;

  return (
    <div className="container mx-auto max-w-6xl p-4">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Users className="h-6 w-6 text-primary" />
            User List by Location
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Server-filtered users by state and city, with CSV export.
          </p>
        </div>
        {committedFilters ? (
          <Badge variant="outline" className="border-border/60 bg-muted/40 text-muted-foreground">
            {users.length} users
          </Badge>
        ) : null}
      </div>

      <Card className="mb-6 border-border/60 bg-card">
        <CardHeader>
          <CardTitle>Select location</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="state-select">State</Label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger id="state-select" className="w-full border-border/60 bg-background">
                  <SelectValue placeholder="Select a state" />
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
              <Label htmlFor="city-select">{selectedState === 'All' ? 'Cities' : 'City'}</Label>
              <Select
                value={selectedCity}
                onValueChange={setSelectedCity}
                disabled={!selectedState}
              >
                <SelectTrigger id="city-select" className="w-full border-border/60 bg-background">
                  <SelectValue
                    placeholder={selectedState === 'All' ? 'All Cities' : 'Select a city'}
                  />
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

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleSearch}
              disabled={isSearching || !selectedState || !selectedCity}
            >
              {isSearching ? 'Searching…' : 'Search users'}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const result = await usersQuery.refetch();
                if (result.error) {
                  toast.error(describeApiError(result.error, 'Could not refresh users'));
                }
              }}
              disabled={!committedFilters || isSearching}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isSearching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleClear}>
              Clear selection
            </Button>
            <Button variant="outline" onClick={exportToCSV} disabled={users.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {usersQuery.isError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-6 text-sm text-destructive">
            {describeApiError(usersQuery.error, 'Could not load users')}
          </CardContent>
        </Card>
      ) : null}

      {committedFilters && !usersQuery.isError ? (
        <Card className="border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Users in {locationLabel}
              <Badge variant="secondary">
                {users.length} total · page {currentPage} of {totalPages}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentUsers.length > 0 ? (
              <div className="space-y-3">
                {currentUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/40 p-4 transition-colors hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                        <User className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email || 'No email'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {user.phone_number || 'No phone'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {user.email_verified ? (
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/15 text-primary"
                        >
                          Email ✓
                        </Badge>
                      ) : null}
                      {user.aadhaar_verified ? (
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/15 text-primary"
                        >
                          Aadhaar ✓
                        </Badge>
                      ) : null}
                      {user.passport_verified ? (
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/15 text-primary"
                        >
                          Passport ✓
                        </Badge>
                      ) : null}
                      {user.license_verified ? (
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/15 text-primary"
                        >
                          License ✓
                        </Badge>
                      ) : null}
                      <Badge
                        variant="outline"
                        className="border-border/60 bg-card text-muted-foreground"
                      >
                        {user.user_state}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                {isSearching ? 'Loading users…' : `No users found in ${locationLabel}.`}
              </p>
            )}

            {totalPages > 1 ? (
              <div className="mt-6 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}–{Math.min(endIndex, users.length)} of {users.length}{' '}
                  users
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>

                  {pageNumbers(totalPages, currentPage).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
