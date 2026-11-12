import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import copy from 'copy-to-clipboard';
import { toast } from 'sonner';
import { Check, Copy, Gift, Loader2, Share2, Sparkles, Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiClient } from '@/api/client';

function formatDate(value) {
  if (!value) return 'Recently joined';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently joined';

  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date);
}

function Referrals() {
  const [copied, setCopied] = useState(false);

  const { data: referralSummary, isLoading } = useQuery({
    queryKey: ['referrals', 'summary'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/referrals/summary');
      return response.data?.data ?? response.data;
    },
    staleTime: 15_000,
  });

  const referralCode = referralSummary?.referral_code || '';
  const referrals = referralSummary?.referrals ?? [];
  const creditValue = referralSummary?.credit_value_inr ?? 0;
  const referralLink = referralCode
    ? `https://marrylocal.in/register?ref=${encodeURIComponent(referralCode)}`
    : '';

  const copyToClipboard = () => {
    if (!referralCode) {
      toast.error('Your referral code is still being generated.');
      return;
    }

    if (copy(referralCode)) {
      setCopied(true);
      toast.success('Referral code copied');
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-5 py-4 text-sm font-medium text-muted-foreground shadow-xs">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading your referral ledger...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <section className="rounded-3xl border border-border/60 bg-card p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground">Referrals</h1>
              <p className="mt-2 max-w-xl text-base leading-relaxed text-muted-foreground">
                Invite people you trust and build service-fee credit when they join with your code.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm font-bold text-foreground">
              {creditValue > 0 ? `₹${creditValue} credit earned` : 'No credit earned yet'}
            </div>
          </div>
        </section>

        <section className="mt-8 bg-card border border-border/60 rounded-3xl p-6 shadow-sm flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Your invitation code
            </p>
            <p className="mt-2 font-mono text-2xl font-black tracking-[0.18em] text-foreground">
              {referralCode || 'Generating...'}
            </p>
            {referralLink ? (
              <p className="mt-2 truncate text-xs text-muted-foreground">{referralLink}</p>
            ) : null}
          </div>

          <Button
            type="button"
            onClick={copyToClipboard}
            disabled={!referralCode}
            className="shrink-0 rounded-xl bg-primary px-4 font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? 'Copied' : 'Copy code'}
          </Button>
        </section>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-border/60 bg-card p-6 text-center shadow-sm">
            <p className="text-3xl font-black tracking-tight text-foreground">{referrals.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Successful referrals</p>
          </div>
          <div className="rounded-3xl border border-border/60 bg-card p-6 text-center shadow-sm">
            <p className="text-3xl font-black tracking-tight text-foreground">₹{creditValue}</p>
            <p className="mt-1 text-sm text-muted-foreground">Deferred fee credit</p>
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <Gift className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-black tracking-tight text-foreground">Your referrals</h2>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            Each validated signup adds ₹50 to your pending subscription credit ledger.
          </p>

          <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-foreground">Name</TableHead>
                  <TableHead className="text-foreground">Joined</TableHead>
                  <TableHead className="text-right text-foreground">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.length === 0 ? (
                  <TableRow className="border-border/60">
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      No referrals yet. Share your code to start earning credit.
                    </TableCell>
                  </TableRow>
                ) : (
                  referrals.map(referral => (
                    <TableRow key={referral.id} className="border-border/60 hover:bg-muted/30">
                      <TableCell className="font-semibold text-foreground">
                        {referral.first_name || 'Member'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(referral.inserted_at)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        ₹{referral.credit_value_inr ?? 50}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-black tracking-tight text-foreground">How it works</h2>
              <ul className="mt-4 space-y-3">
                {[
                  'Share your referral code with friends and family.',
                  'Each validated signup adds ₹50 to your deferred service-fee credit.',
                  'Credit applies when subscription fee gateways open later.',
                  'A maximum of 8 referrals is permitted.',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {referralLink ? (
          <section className="mt-8 rounded-3xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <Share2 className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-black tracking-tight text-foreground">
                Your referral link
              </h2>
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 break-all text-sm font-medium text-muted-foreground">
                {referralLink}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (copy(referralLink)) toast.success('Referral link copied');
                }}
                className="shrink-0 rounded-xl border-border/60 bg-background font-bold text-foreground"
                aria-label="Copy referral link"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default Referrals;
