import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  AtSign,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  UserSearch,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PresenceBadge } from '@/components/PresenceBadge';
import { isValidLookupQuery, useProfileLookup } from '@/hooks/useProfileLookup';
import { mediaUrl } from '@/lib/media';

function lookupKind(query) {
  const value = String(query || '').trim();

  if (value.startsWith('@')) return 'handle';
  if (value.includes('@')) return 'email';
  if (/^[A-Za-z]/.test(value)) return 'handle';
  return 'phone';
}

export function SearchUser() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // The URL is the single source of truth for the committed lookup. This is what
  // lets an administrator open a profile and press Back without losing the card:
  // the component remounts, reads `?query=` and React Query serves the cached
  // result immediately.
  const committedQuery = searchParams.get('query') ?? '';
  const submittedQuery = committedQuery.trim();
  const hasValidQuery = submittedQuery.length > 0 && isValidLookupQuery(submittedQuery);

  const [input, setInput] = useState(committedQuery);

  // Keep the text field in sync with browser history navigation (Back/Forward).
  useEffect(() => {
    setInput(committedQuery);
  }, [committedQuery]);

  const query = useProfileLookup(hasValidQuery ? submittedQuery : '', hasValidQuery);
  const profile = query.data;
  const matchedBy = lookupKind(submittedQuery);
  const image =
    profile?.avatar_url ??
    (profile?.images?.[0] ? mediaUrl(profile.shortid, profile.images[0]) : null);
  const firstName = profile?.first_name ?? profile?.firstname ?? 'Member';
  const lastName = profile?.last_name ?? profile?.lastname ?? '';
  const name = [firstName, lastName].filter(Boolean).join(' ');
  const initials =
    `${profile?.first_name?.[0] ?? profile?.firstname?.[0] ?? ''}${
      profile?.last_name?.[0] ?? profile?.lastname?.[0] ?? ''
    }`.toUpperCase() || name.charAt(0).toUpperCase();

  const submit = event => {
    event.preventDefault();
    const next = input.trim();

    if (!isValidLookupQuery(next)) {
      // Drop any stale URL parameter so the previous result card cannot linger
      // behind an invalid submission.
      setSearchParams({});
      return;
    }

    if (next === submittedQuery) {
      query.refetch();
      return;
    }

    setSearchParams({ query: next });
  };

  const dismissResult = () => {
    setInput('');
    // Replace the current history entry so Back does not resurrect the dismissed
    // lookup, and purge every cached lookup page so the next search is clean.
    setSearchParams({}, { replace: true });
    queryClient.removeQueries({ queryKey: ['profiles', 'lookup'] });
  };

  const invalid = input.trim().length > 0 && !isValidLookupQuery(input);

  return (
    <div
      className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8"
      data-testid="search-user-section"
    >
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-xs dark:border-border">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <UserSearch className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Direct profile lookup
              </h1>
              <p className="text-sm text-muted-foreground">
                Find one member by complete email address, 10-digit phone number, or @handle.
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="direct-lookup">Email, phone, or handle</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <Input
                  id="direct-lookup"
                  data-testid="lookup-input"
                  autoComplete="off"
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  placeholder="name@example.com, 9876543210, or @handle"
                  className="h-11 rounded-xl border-border/60 pl-9 focus:border-amber-400"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Handle matching ignores the leading @ and letter case. Phones ignore spaces and
                country-code formatting; emails must be complete.
              </p>
              <p className="text-xs text-muted-foreground">
                Note: Profiles only appear if the user has enabled search visibility for that
                contact method and matches your distance privacy settings.
              </p>
              {invalid && (
                <p className="inline-flex items-center gap-2 text-xs font-semibold text-rose-700">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Enter a complete email address, a 10-digit phone number, or a handle.
                </p>
              )}
            </div>

            <Button
              type="submit"
              data-testid="lookup-submit"
              disabled={query.isFetching}
              className="h-11 w-full rounded-xl bg-amber-400 text-slate-900 dark:text-slate-900 font-bold shadow-xs hover:bg-amber-300 sm:w-auto sm:px-8"
            >
              {query.isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Search Database
            </Button>
          </form>
        </section>

        {query.isError && (
          <div className="flex items-start gap-3 rounded-3xl border border-rose-100 bg-rose-50 p-5 shadow-xs">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-bold text-rose-900">Lookup failed</p>
              <p className="mt-1 text-sm text-rose-700">
                {query.error?.message || 'Try a different email or phone number.'}
              </p>
            </div>
          </div>
        )}

        {hasValidQuery && !query.isFetching && !query.isError && !profile && (
          <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-xs dark:border-border">
            <p className="font-bold text-foreground">No matching profile found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirm the email address is complete or that the phone number has 10 digits.
            </p>
          </div>
        )}

        {profile && (
          <div className="relative" data-testid="lookup-result-card">
            <Link
              to={`/user/${profile.shortid ?? profile.id}`}
              className="block rounded-3xl border border-border bg-card p-6 pr-16 shadow-xs transition-colors hover:border-border/60 dark:border-border"
              data-testid="lookup-result"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border">
                  {image ? (
                    <img src={image} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-2xl font-black text-primary">
                      {initials}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-xl font-black text-foreground">
                      {name}
                      {profile?.age ? (
                        <span className="font-semibold text-muted-foreground">, {profile.age}</span>
                      ) : null}
                    </h2>
                    <PresenceBadge profile={profile} />
                  </div>

                  <p className="mt-0.5 truncate text-sm font-medium text-muted-foreground">
                    @{profile?.user_handle || 'member'}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {(profile?.city || profile?.state) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-1 font-medium text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {[profile.city, profile.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {profile?.community && (
                      <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 font-medium text-accent-foreground">
                        {profile.community}
                      </span>
                    )}
                    {matchedBy === 'email' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-1 font-medium text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        Email match
                      </span>
                    ) : matchedBy === 'handle' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-1 font-medium text-muted-foreground">
                        <AtSign className="h-3 w-3" />
                        Handle match
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-1 font-medium text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        Phone match
                      </span>
                    )}
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 self-start rounded-xl border border-border/60 px-3 py-2 text-xs font-bold text-muted-foreground">
                  View profile
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>

              <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {profile?.bio || `Open ${name}'s profile to view their full details.`}
              </p>
            </Link>

            <button
              type="button"
              onClick={dismissResult}
              aria-label="Dismiss lookup result"
              data-testid="lookup-result-dismiss"
              className="absolute top-4 right-4 p-2 bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors cursor-pointer z-10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchUser;
