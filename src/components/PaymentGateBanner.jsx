import { Link } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatInr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

export function PaymentGateBanner({ user }) {
  const base = Number(user?.accepted_one_time_fees_amount ?? 500);
  const credits = Number(user?.referral_credits_count ?? 0);
  const discount = Math.min(base, credits * 50);
  const payable = Math.max(base - discount, 0);

  return (
    <div
      data-testid="payment-gate-banner"
      className="bg-card border border-primary/40 rounded-2xl p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CreditCard className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-black tracking-tight text-foreground">
              Annual Service Fee Required
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Your area has more than 250 active members, so annual service fee payment is required
              to continue discovery and search.
            </p>
            <p className="mt-3 text-sm font-semibold text-foreground">
              Base fee {formatInr(base)}
              {discount > 0 ? ` · Referral discount −${formatInr(discount)}` : ''} · Payable{' '}
              {formatInr(payable)}
            </p>
            {credits > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {credits} referral credit{credits === 1 ? '' : 's'} × ₹50 applied.
              </p>
            ) : null}
          </div>
        </div>

        <Button
          asChild
          className="shrink-0 rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Link to="/dashboard/servicefees">Complete Service Fee Payment →</Link>
        </Button>
      </div>
    </div>
  );
}

export default PaymentGateBanner;
