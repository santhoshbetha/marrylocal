import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, Loader2, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { apiClient, describeApiError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

function ResendForm({ email, setEmail, mutation, onBackToLogin }) {
  const submit = event => {
    event.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }

    mutation.mutate(email.trim().toLowerCase());
  };

  return (
    <form noValidate onSubmit={submit} className="grid gap-4 text-left">
      <div className="grid gap-2">
        <Label htmlFor="verification-email">Email address</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <Input
            id="verification-email"
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
        disabled={mutation.isPending}
        className="h-11 w-full rounded-xl bg-amber-400 text-slate-900 dark:text-slate-900 font-bold hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {mutation.isPending ? (
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Mail className="mr-2 h-4 w-4" />
        )}
        Resend Verification Email
      </Button>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full rounded-xl text-foreground font-bold"
        onClick={onBackToLogin}
      >
        Back to sign in
      </Button>
    </form>
  );
}

function EmailVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const currentUser = useAuthStore(state => state.currentUser);
  const setAuthSession = useAuthStore(state => state.login);
  const attemptedTokenRef = useRef(null);

  const token =
    searchParams.get('token') || searchParams.get('token_hash') || searchParams.get('code') || '';

  const [email, setEmail] = useState(location.state?.email || currentUser?.email || '');

  const verifyMutation = useMutation({
    mutationFn: async confirmationToken => {
      const response = await apiClient.post('/api/v1/auth/verify-email', {
        token: confirmationToken,
      });

      return response.data?.data ?? response.data;
    },
    onSuccess: payload => {
      if (payload?.token) {
        setAuthSession(payload.token, payload.user);
        queryClient.clear();
      }

      toast.success('Email verified. Your account is ready.');

      const destination = payload?.user?.onboarding_complete
        ? '/dashboard/search'
        : '/onboarding/lifestyle';

      navigate(destination, { replace: true });
    },
    onError: error => {
      toast.error(describeApiError(error, 'This verification link is invalid or has expired.'));
    },
  });

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

  const verifyToken = verifyMutation.mutate;

  useEffect(() => {
    if (!token || attemptedTokenRef.current === token) return;

    attemptedTokenRef.current = token;
    verifyToken(token);
  }, [token, verifyToken]);

  if (token && (verifyMutation.isPending || verifyMutation.isSuccess)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-sm sm:p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Verifying your email
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hold on while we activate your account and prepare your profile setup.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            Securing your session...
          </div>
        </div>
      </div>
    );
  }

  if (token && verifyMutation.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-sm sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Link could not be verified
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {describeApiError(
                verifyMutation.error,
                'This verification link is invalid or has expired.',
              )}
            </p>
          </div>

          <ResendForm
            email={email}
            setEmail={setEmail}
            mutation={resendMutation}
            onBackToLogin={() => navigate('/login')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-accent-foreground">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Verify your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {email ? (
              <>
                We sent a verification link to <strong className="text-foreground">{email}</strong>.
                Open it to activate your account.
              </>
            ) : (
              'Enter the email address you registered with and we will send a fresh link.'
            )}
          </p>
        </div>

        <ResendForm
          email={email}
          setEmail={setEmail}
          mutation={resendMutation}
          onBackToLogin={() => navigate('/login')}
        />

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already verified?{' '}
          <Link
            to="/login"
            className="font-semibold text-amber-700 underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default EmailVerification;
