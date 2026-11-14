import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiClient, describeApiError } from '@/api/client';
import {
  adminKeys,
  approveAdminVerification,
  fetchAdminVerifications,
  rejectAdminVerification,
} from '@/api/admin';
import { cities } from '@/lib/cities';
import { states } from '@/lib/states';
import { cn } from '@/lib/utils';

const VIEWS = [
  { value: 'my_queue', label: 'My Assigned Queue' },
  { value: 'all_pending', label: 'All Pending (Admin Override)' },
  { value: 'history', label: 'Review History' },
];

const PER_PAGE = 12;

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-IN');
}

function applicantName(user) {
  return [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Member';
}

function pageNumbers(current, total) {
  if (total <= 0) return [];

  const start = Math.max(1, Math.min(current - 2, total - 4));
  const end = Math.min(total, start + 4);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default function AdminVerifications() {
  const queryClient = useQueryClient();
  const [view, setView] = useState('my_queue');
  const [stateFilter, setStateFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All Cities');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rebalancePending, setRebalancePending] = useState(false);

  const availableCities = useMemo(() => {
    const list = stateFilter === 'All' ? cities : cities.filter(city => city.state === stateFilter);
    return [...new Set(list.map(city => city.name))].sort();
  }, [stateFilter]);

  const filters = { view, state: stateFilter, city: cityFilter, page };
  const queueQuery = useQuery({
    queryKey: adminKeys.verifications(filters),
    queryFn: ({ signal }) => fetchAdminVerifications({ ...filters, per_page: PER_PAGE, signal }),
    staleTime: 15_000,
  });

  const items = queueQuery.data?.items ?? [];
  const meta = queueQuery.data?.meta ?? {
    page: 1,
    per_page: PER_PAGE,
    total_count: 0,
    total_pages: 0,
  };

  const invalidateQueue = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'verification-history'] });
  };

  const approveMutation = useMutation({
    mutationFn: id => approveAdminVerification(id),
    onSuccess: () => {
      invalidateQueue();
      setSelected(null);
      setRejectionReason('');
      toast.success('Verification approved. The raw document was purged.');
    },
    onError: error => {
      toast.error(describeApiError(error, 'Could not approve this verification.'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => rejectAdminVerification(id, reason),
    onSuccess: () => {
      invalidateQueue();
      setSelected(null);
      setRejectionReason('');
      toast.success('Verification rejected. The member has been notified.');
    },
    onError: error => {
      toast.error(describeApiError(error, 'Could not reject this verification.'));
    },
  });

  const handleRebalance = async () => {
    setRebalancePending(true);

    try {
      const { data } = await apiClient.post('/api/v1/admin/verifications/rebalance', {});
      toast.success(`Rebalanced ${data?.data?.reassigned ?? 0} pending verification(s).`);
      invalidateQueue();
    } catch (error) {
      toast.error(describeApiError(error, 'Could not rebalance the queue.'));
    } finally {
      setRebalancePending(false);
    }
  };

  const selectView = nextView => {
    setView(nextView);
    setPage(1);
    setSelected(null);
  };

  const selectState = nextState => {
    setStateFilter(nextState);
    setCityFilter('All Cities');
    setPage(1);
  };

  const selectCity = nextCity => {
    setCityFilter(nextCity);
    setPage(1);
  };

  const showingFrom = meta.total_count === 0 ? 0 : (meta.page - 1) * meta.per_page + 1;
  const showingTo = Math.min(meta.total_count, meta.page * meta.per_page);
  const isPendingView = view !== 'history';
  const busy = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="container mx-auto max-w-6xl p-4" data-testid="admin-verifications-page">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Identity Verification Review
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review documents assigned to you, override the shared pending queue, and audit every
            decision.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={() => queueQuery.refetch()}
          disabled={queueQuery.isFetching}
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', queueQuery.isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="mb-4 grid gap-2 rounded-2xl border border-border/60 bg-muted/20 p-1 lg:grid-cols-3">
        {VIEWS.map(option => (
          <button
            key={option.value}
            type="button"
            data-testid={`view-tab-${option.value}`}
            onClick={() => selectView(option.value)}
            className={cn(
              'rounded-xl px-4 py-3 text-sm font-bold transition-colors',
              view === option.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-2">
          <Label>State</Label>
          <Select value={stateFilter} onValueChange={selectState}>
            <SelectTrigger
              data-testid="verification-state-filter"
              className="h-10 w-full rounded-xl border-border/60 bg-background"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All states</SelectItem>
              {states.map(state => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid flex-1 gap-2">
          <Label>City</Label>
          <Select value={cityFilter} onValueChange={selectCity}>
            <SelectTrigger
              data-testid="verification-city-filter"
              className="h-10 w-full rounded-xl border-border/60 bg-background"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Cities">All cities</SelectItem>
              {availableCities.map(city => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {view === 'all_pending' ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl"
            onClick={handleRebalance}
            disabled={rebalancePending}
          >
            {rebalancePending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Rebalance stale
          </Button>
        ) : null}
      </div>

      {queueQuery.isLoading ? (
        <div className="flex items-center justify-center rounded-3xl border border-border/60 bg-card p-12 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading verifications…
        </div>
      ) : queueQuery.isError ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-sm font-semibold text-destructive">
          Could not load this queue. Please refresh.
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-border/60 bg-card p-12 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold text-foreground">
            {isPendingView ? 'No pending verifications here.' : 'No review history yet.'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isPendingView
              ? 'New submissions are distributed automatically across active admins.'
              : 'Approved and rejected verifications will appear here permanently.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item =>
            isPendingView ? (
              <article
                key={item.id}
                data-testid={`admin-verification-row-${item.id}`}
                className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-black text-foreground">
                      {applicantName(item.user)}
                    </h2>
                    <Badge variant="secondary">
                      {item.user?.age || '—'} yrs · {item.user?.gender || '—'}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {item.document_type}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[item.user?.city, item.user?.state].filter(Boolean).join(', ') ||
                      'Unknown location'}
                    {' · submitted '}
                    {formatDate(item.submitted_at || item.inserted_at)}
                  </p>
                </div>

                <Button
                  type="button"
                  data-testid={`inspect-verification-${item.id}`}
                  className="rounded-xl font-bold"
                  onClick={() => {
                    setSelected(item);
                    setRejectionReason('');
                  }}
                >
                  Inspect Document
                </Button>
              </article>
            ) : (
              <article
                key={item.id}
                data-testid={`verification-history-row-${item.id}`}
                className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-black text-foreground">
                        {applicantName(item.user)}
                      </h2>
                      <Badge
                        className={
                          item.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'bg-destructive/10 text-destructive'
                        }
                      >
                        {item.status === 'approved' ? 'Approved' : 'Rejected'}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {item.document_type}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[item.user?.city, item.user?.state].filter(Boolean).join(', ') ||
                        'Unknown location'}
                    </p>
                  </div>

                  <div className="text-right text-xs text-muted-foreground">
                    <p>Submitted {formatDate(item.submitted_at)}</p>
                    <p>Reviewed {formatDate(item.reviewed_at)}</p>
                    <p className="font-semibold text-foreground">
                      {item.reviewed_by_admin_email || 'Reviewer unavailable'}
                    </p>
                  </div>
                </div>

                {item.rejection_reason ? (
                  <p className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm font-semibold text-destructive">
                    {item.rejection_reason}
                  </p>
                ) : null}
                {item.admin_notes ? (
                  <p className="mt-2 text-sm text-muted-foreground">{item.admin_notes}</p>
                ) : null}
              </article>
            ),
          )}
        </div>
      )}

      <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm font-semibold text-muted-foreground" data-testid="pagination-summary">
          Showing {showingFrom}–{showingTo} of {meta.total_count} item
          {meta.total_count === 1 ? '' : 's'}
        </p>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            disabled={meta.page <= 1}
            onClick={() => setPage(current => Math.max(1, current - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {pageNumbers(meta.page, meta.total_pages).map(number => (
            <Button
              key={number}
              type="button"
              size="sm"
              variant={number === meta.page ? 'default' : 'outline'}
              className="rounded-lg"
              onClick={() => setPage(number)}
            >
              {number}
            </Button>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            disabled={meta.page >= meta.total_pages || meta.total_pages === 0}
            onClick={() => setPage(current => current + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={open => {
          if (!open) {
            setSelected(null);
            setRejectionReason('');
          }
        }}
      >
        <DialogContent
          data-testid="verification-inspect-dialog"
          className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
        >
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{applicantName(selected.user)}</DialogTitle>
                <DialogDescription>
                  {selected.user?.age || '—'} years · {selected.user?.gender || '—'} ·{' '}
                  {[selected.user?.city, selected.user?.state].filter(Boolean).join(', ') ||
                    'Unknown location'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20">
                  {selected.preview_url ? (
                    <img
                      src={selected.preview_url}
                      alt={`${selected.document_type} document submitted by ${applicantName(selected.user)}`}
                      className="max-h-[60vh] w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                      Document preview unavailable. The R2 object may already be purged.
                    </div>
                  )}
                </div>

                <div className="space-y-3 text-sm">
                  <div className="rounded-2xl border border-border/60 bg-card p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Submission
                    </p>
                    <p className="mt-1 font-semibold capitalize text-foreground">
                      {selected.document_type}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(selected.submitted_at || selected.inserted_at)}
                    </p>
                  </div>

                  {selected.preview_url ? (
                    <a
                      href={selected.preview_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="open-full-image"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Full Image in New Tab ↗
                    </a>
                  ) : null}

                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Preview links expire after 15 minutes. The raw image is purged immediately after
                    approval or rejection.
                  </p>
                </div>
              </div>

              {isPendingView ? (
                <div className="space-y-3 border-t border-border/60 pt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="rejection-reason">Rejection reason (required to reject)</Label>
                    <Textarea
                      id="rejection-reason"
                      data-testid="verification-reject-reason"
                      rows={2}
                      maxLength={1000}
                      value={rejectionReason}
                      onChange={event => setRejectionReason(event.target.value)}
                      placeholder="Explain what the member must fix before resubmitting."
                      className="rounded-xl border-border/60 bg-background"
                    />
                  </div>

                  <DialogFooter className="gap-2 sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      data-testid="reject-verification"
                      className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                      disabled={busy || rejectionReason.trim().length < 3}
                      onClick={() =>
                        rejectMutation.mutate({
                          id: selected.id,
                          reason: rejectionReason.trim(),
                        })
                      }
                    >
                      {rejectMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Reject (with Reason)
                    </Button>

                    <Button
                      type="button"
                      data-testid="approve-verification"
                      className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-500"
                      disabled={busy}
                      onClick={() => approveMutation.mutate(selected.id)}
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Approve Verification
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm">
                  <p className="font-semibold text-foreground capitalize">
                    {selected.status} · {formatDate(selected.reviewed_at)}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Reviewer: {selected.reviewed_by_admin_email || 'Unavailable'}
                  </p>
                  {selected.rejection_reason ? (
                    <p className="mt-2 font-semibold text-destructive">
                      {selected.rejection_reason}
                    </p>
                  ) : null}
                </div>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
