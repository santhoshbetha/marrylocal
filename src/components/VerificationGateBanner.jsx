import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function VerificationGateBanner() {
  return (
    <div
      data-testid="verification-gate-banner"
      className="bg-card border border-primary/40 rounded-2xl p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-black tracking-tight text-foreground">
              Identity Verification Required
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Your free 7-day trial period has ended and there are over 50 active members in your
              area. Please complete a quick one-time ID verification (Aadhaar, Passport, or Driver's
              License) to unlock search.
            </p>
          </div>
        </div>

        <Button
          asChild
          className="shrink-0 rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Link to="/verify">Verify Profile Now →</Link>
        </Button>
      </div>
    </div>
  );
}

export default VerificationGateBanner;
