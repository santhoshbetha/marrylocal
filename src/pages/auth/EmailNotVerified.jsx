import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, Loader2, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { apiClient, describeApiError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

function EmailNotVerified() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAuthStore(state => state.currentUser);

  const [email, setEmail] = useState(location.state?.email || currentUser?.email || '');

  const resendMutation = useMutation({
    mutationFn: async recipient => {
      const response = await apiClient.post('/api/v1/auth/resend-confirmation', {
        email: recipient,
      });

      return response.data;
    },
    onSuccess: () => {
      toast.success('Verification email sent. Check your inbox and spam folder.');
    },
    onError: error => {
      toast.error(describeApiError(error, 'Could not resend the verification email.'));
    },
  });

  const resend = event => {
    event.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }

    resendMutation.mutate(email.trim().toLowerCase());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-accent-foreground">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Email not verified</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {email ? (
              <>
                We still need to verify <strong className="text-foreground">{email}</strong>. Open
                the link in your inbox to activate your account.
              </>
            ) : (
              'Open the verification link from your inbox to activate your account.'
            )}
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-100 bg-accent px-4 py-3 text-sm font-medium text-accent-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Verification protects your contact details and unlocks discovery, shortlists, and
              local matches.
            </p>
          </div>
        </div>

        <form noValidate onSubmit={resend} className="mt-5 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="not-verified-email">Email address</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
              <Input
                id="not-verified-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="h-11 rounded-xl pl-9"
                value={email}
                onChange={event => setEmail(event.target.value)}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={resendMutation.isPending}
            className="h-11 w-full rounded-xl bg-amber-400 text-slate-900 dark:text-slate-900 font-bold hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {resendMutation.isPending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Resend Verification Email
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={resendMutation.isPending}
            className="h-11 w-full rounded-xl text-foreground font-bold"
            onClick={() => navigate('/login')}
          >
            Back to sign in
          </Button>
        </form>

        {resendMutation.isPending && (
          <p className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Sending a fresh verification link...
          </p>
        )}
      </div>
    </div>
  );
}

export default EmailNotVerified;
