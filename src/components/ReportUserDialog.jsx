import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Flag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { apiClient, describeApiError } from '@/api/client';
import { cn } from '@/lib/utils';

const REPORT_REASONS = [
  { value: 'fake_profile', label: 'Fake / Impersonation Profile' },
  { value: 'inappropriate_photos', label: 'Inappropriate Photos' },
  { value: 'harassment', label: 'Harassment or Abusive Behavior' },
  { value: 'married_or_taken', label: 'Already Married / Not Genuine' },
  { value: 'scam_or_spam', label: 'Spam or Financial Scam' },
  { value: 'other', label: 'Other' },
];

function displayName(user) {
  if (!user) return 'this member';
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || 'this member';
}

export function ReportUserDialog({ open, onOpenChange, user }) {
  const [reason, setReason] = useState('fake_profile');
  const [details, setDetails] = useState('');

  const reportedUserId = user?.id ?? user?.userid ?? null;

  const reportMutation = useMutation({
    mutationFn: async () =>
      apiClient.post('/api/v1/reports', {
        reported_user_id: reportedUserId,
        reason,
        details: details.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Thank you. Your report has been submitted to our safety team.');
      setReason('fake_profile');
      setDetails('');
      onOpenChange(false);
    },
    onError: error => {
      toast.error(describeApiError(error, 'Could not submit your report. Please try again.'));
    },
  });

  const handleSubmit = event => {
    event.preventDefault();
    if (!reportedUserId || reportMutation.isPending) return;
    reportMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="report-user-dialog" className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" />
              Report {displayName(user)}
            </DialogTitle>
            <DialogDescription>
              Tell our safety team what happened. Reports are private, and the member is never told
              who submitted them.
            </DialogDescription>
          </DialogHeader>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">Reason</legend>
            <div className="space-y-2">
              {REPORT_REASONS.map(option => (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors',
                    reason === option.value
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40',
                  )}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={option.value}
                    data-testid={`report-reason-${option.value}`}
                    checked={reason === option.value}
                    onChange={() => setReason(option.value)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="font-semibold">{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <label htmlFor="report-details" className="text-sm font-semibold text-foreground">
              Additional details{' '}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="report-details"
              data-testid="report-details"
              value={details}
              maxLength={1000}
              rows={4}
              onChange={event => setDetails(event.target.value)}
              placeholder="What should the safety team know?"
              className="rounded-xl border-border/60 bg-background"
            />
            <p className="text-right text-xs text-muted-foreground">{details.length} / 1000</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={reportMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="report-submit"
              className="rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90"
              disabled={!reportedUserId || reportMutation.isPending}
            >
              {reportMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Flag className="mr-2 h-4 w-4" />
              )}
              {reportMutation.isPending ? 'Submitting…' : 'Submit report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ReportUserDialog;
