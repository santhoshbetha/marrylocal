import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Flag, Loader2, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { describeApiError } from '@/api/client';
import { adminKeys, fetchAdminReports, resolveAdminReport } from '@/api/admin';

const REASON_LABELS = {
  fake_profile: 'Fake / Impersonation Profile',
  inappropriate_photos: 'Inappropriate Photos',
  harassment: 'Harassment or Abusive Behavior',
  married_or_taken: 'Already Married / Not Genuine',
  scam_or_spam: 'Spam or Financial Scam',
  other: 'Other',
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending review' },
  { value: 'reviewed_action_taken', label: 'Action taken' },
  { value: 'dismissed', label: 'Dismissed' },
];

function memberName(member) {
  if (!member) return 'Unknown member';
  return (
    [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email || 'Member'
  );
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString('en-IN');
}

export default function AdminReports() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState({});

  const reportsQuery = useQuery({
    queryKey: adminKeys.reports(status),
    queryFn: ({ signal }) => fetchAdminReports(status, { signal }),
    staleTime: 15_000,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, nextStatus, suspend }) =>
      resolveAdminReport(id, {
        status: nextStatus,
        suspend_user: suspend,
        admin_notes: notes[id]?.trim() || null,
      }),
    onSuccess: (_report, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
      setNotes(current => ({ ...current, [variables.id]: '' }));
      toast.success(
        variables.nextStatus === 'dismissed'
          ? 'Report dismissed.'
          : variables.suspend
            ? 'Report resolved and member suspended.'
            : 'Report resolved.',
      );
    },
    onError: error => {
      toast.error(describeApiError(error, 'Could not update this report.'));
    },
  });

  const reports = reportsQuery.data ?? [];
  const pending = status === 'pending';

  return (
    <div className="container mx-auto max-w-6xl p-4">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Flag className="h-6 w-6 text-destructive" />
            User Reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Member safety reports. Resolve actioned reports or dismiss noise. Every decision is
            audit-logged.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 w-44 rounded-xl border-border/60 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="border-border/60 bg-muted/40">
            {reports.length} report{reports.length === 1 ? '' : 's'}
          </Badge>
        </div>
      </div>

      {reportsQuery.isLoading ? (
        <div className="flex items-center justify-center rounded-3xl border border-border/60 bg-card p-12 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading reports…
        </div>
      ) : reportsQuery.isError ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-sm font-semibold text-destructive">
          Could not load reports. Please refresh.
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-3xl border border-border/60 bg-card p-12 text-center">
          <ShieldOff className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold text-foreground">No reports in this state.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            New member reports will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => {
            const isBusy = resolveMutation.isPending && resolveMutation.variables?.id === report.id;

            return (
              <section
                key={report.id}
                data-testid={`admin-report-${report.id}`}
                className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black tracking-tight text-foreground">
                        {memberName(report.reported_user)}
                      </h2>
                      {report.reported_user?.user_state !== 'active' ? (
                        <Badge className="bg-destructive/10 text-destructive">Suspended</Badge>
                      ) : null}
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        {report.reported_user_report_count} total report
                        {report.reported_user_report_count === 1 ? '' : 's'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {report.reported_user?.email || 'No email'} ·{' '}
                      {report.reported_user?.user_handle
                        ? `@${report.reported_user.user_handle}`
                        : 'No handle'}{' '}
                      ·{' '}
                      {[report.reported_user?.city, report.reported_user?.state]
                        .filter(Boolean)
                        .join(', ') || 'Unknown city'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Reported by {memberName(report.reporter)}
                      {report.reporter?.email ? ` (${report.reporter.email})` : ''} ·{' '}
                      {formatDate(report.inserted_at)}
                    </p>
                  </div>

                  <Badge variant="outline" className="border-border/60 bg-muted/40 capitalize">
                    {report.status.replaceAll('_', ' ')}
                  </Badge>
                </div>

                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    {REASON_LABELS[report.reason] || report.reason}
                  </p>
                  {report.details ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {report.details}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No additional details.</p>
                  )}
                </div>

                {pending ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-2">
                      <Label htmlFor={`report-notes-${report.id}`}>Admin notes</Label>
                      <Textarea
                        id={`report-notes-${report.id}`}
                        data-testid={`admin-report-notes-${report.id}`}
                        rows={2}
                        maxLength={2000}
                        value={notes[report.id] || ''}
                        onChange={event =>
                          setNotes(current => ({ ...current, [report.id]: event.target.value }))
                        }
                        placeholder="Optional context for the audit trail"
                        className="rounded-xl border-border/60 bg-background"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        data-testid={`admin-report-dismiss-${report.id}`}
                        className="rounded-xl"
                        disabled={isBusy}
                        onClick={() =>
                          resolveMutation.mutate({
                            id: report.id,
                            nextStatus: 'dismissed',
                            suspend: false,
                          })
                        }
                      >
                        {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Dismiss
                      </Button>
                      <Button
                        type="button"
                        data-testid={`admin-report-suspend-${report.id}`}
                        className="rounded-xl bg-destructive font-bold text-white hover:bg-destructive/90"
                        disabled={isBusy}
                        onClick={() =>
                          resolveMutation.mutate({
                            id: report.id,
                            nextStatus: 'reviewed_action_taken',
                            suspend: true,
                          })
                        }
                      >
                        {isBusy ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldOff className="mr-2 h-4 w-4" />
                        )}
                        Resolve &amp; Suspend User
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-border/60 bg-muted/30 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Review decision
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {report.status.replaceAll('_', ' ')}
                      {report.reviewed_at ? ` · ${formatDate(report.reviewed_at)}` : ''}
                    </p>
                    {report.admin_notes ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                        {report.admin_notes}
                      </p>
                    ) : null}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
