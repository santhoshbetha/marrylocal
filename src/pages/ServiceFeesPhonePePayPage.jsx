import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Payment } from '@/components/Payment';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

function formatInr(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function ServiceFeesPhonePePayPage() {
  const currentUser = useAuthStore(state => state.currentUser);

  const { data: profileResponse, isLoading } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/profiles/me');
      return response.data;
    },
    staleTime: 30_000,
  });

  const profile = profileResponse?.data?.profile ?? profileResponse?.profile ?? currentUser ?? {};

  const pricing = useMemo(() => {
    const base = Number(profile?.accepted_one_time_fees_amount ?? 500);
    const credits = Number(profile?.referral_credits_count ?? 0);
    const discount = Math.min(base, credits * 50);
    const subtotal = Math.max(base - discount, 0);
    const gst = Math.round(subtotal * 0.18);

    return {
      base,
      discount,
      subtotal,
      gst,
      total: subtotal + gst,
      credits,
    };
  }, [profile?.accepted_one_time_fees_amount, profile?.referral_credits_count]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl rounded-3xl border border-border/60 bg-card shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-7 w-7" />
          </div>
          <CardTitle className="mt-4 text-2xl font-black tracking-tight text-foreground">
            Annual Service Fees
          </CardTitle>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your area has crossed the community density threshold. Complete the annual fee to unlock
            discovery and search.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/40 p-5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Base service fee</span>
              <span>{formatInr(pricing.base)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Referral credits ({pricing.credits} × ₹50)</span>
              <span>-{formatInr(pricing.discount)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Fee after discount</span>
              <span>{formatInr(pricing.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>GST at 18%</span>
              <span>{formatInr(pricing.gst)}</span>
            </div>
            <div className="flex justify-between border-t border-border/60 pt-2 text-lg font-bold text-foreground">
              <span>Total due</span>
              <span>{formatInr(pricing.total)}</span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p>
              PhonePe verifies the payment through a server-side checksum callback. The final amount
              is recalculated by the Elixir API before the order is created.
            </p>
          </div>

          <Payment buttonname="Proceed to Pay with PhonePe" className="w-full py-3 text-base" />

          {profile?.onetime_fees_paid ? (
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Service fee already paid
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default ServiceFeesPhonePePayPage;
